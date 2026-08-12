'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { assignCategoryGroupAction } from '~src/actions/category-group/assign-category-group.action';
import { createGroupAction } from '~src/actions/category-group/create-group.action';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import {
    type CategoryConfigRow,
    disagreementsByColumn,
} from '~src/lib/console/category-rows';
import { activityShare, suggestFeaturedIds } from '~src/lib/setup/suggestions';
import { formatCount, formatHours } from '~src/utils/format-stats';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { effectiveSortKey } from '../../category-sort';
import { PromptDialog } from '../../shared/prompt-dialog';
import { reorderCategoriesAction } from '../game-tab/actions/reorder-categories.action';
import type { ReorderChange } from '../game-tab/reorder-changes';
import { computeReorderChanges } from '../game-tab/reorder-changes';
import { fireUndoToast } from '../moderation/shared/undo-toast';
import { updateVisibilityAction } from '../visibility/actions/update-visibility.action';
import styles from './board-categories.module.scss';

/** Past-tense label for a Featured/Archived toggle's undo-toast message. */
function toggleLabel(field: 'isMain' | 'active', value: boolean): string {
    if (field === 'isMain')
        return value ? 'featured' : 'removed from the board';
    return value ? 'restored' : 'archived';
}

interface Props {
    game: ResolvedGame;
    /** Every category the console knows about — the table renders the
     *  featured slice, the rest only feed the coverage stat and the
     *  archived disclosure. */
    rows: ManageCategoryRow[];
    /** Per-category configuration, keyed by id — the matrix columns. */
    config: CategoryConfigRow[];
    groups: ManageGroup[];
    onRowChange: (
        categoryId: number,
        patch: { isMain?: boolean; active?: boolean },
    ) => void;
    onRowGroupChange: (
        categoryId: number,
        groupId: number | null,
        groupName: string | null,
    ) => void;
    onRowsReorder: (changes: ReorderChange[]) => void;
    onGroupCreated: (group: ManageGroup) => void;
    onEdit: (categoryId: number) => void;
}

/**
 * The board, as configured — the categories that are actually on it, in the
 * order the public page shows them.
 *
 * This used to be every category the game has ever seen (~860 on SM64, nearly
 * all of them junk harvested from LiveSplit splits) behind an All/Current/
 * Archived filter. The board is eight rows; the screen was answering "what
 * categories exist" when the question is "what is on my board, and where does
 * it disagree with itself". Featuring something is now a deliberate errand —
 * the pane header's add dialog — instead of a checkbox column over a thousand
 * rows.
 *
 * That cut is also what makes the configuration columns readable: `▲` marks a
 * category that differs from the rest of the board, which means something
 * across eight peers and nothing at all across nine hundred.
 */
export function BoardCategoriesTable({
    game,
    rows,
    config,
    groups,
    onRowChange,
    onRowGroupChange,
    onRowsReorder,
    onGroupCreated,
    onEdit,
}: Props) {
    const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
    const [_isPending, startTransition] = useTransition();
    const [groupPromptRow, setGroupPromptRow] =
        useState<ManageCategoryRow | null>(null);
    const [groupPromptPending, setGroupPromptPending] = useState(false);
    const [groupPromptError, setGroupPromptError] = useState<string | null>(
        null,
    );
    const [dragId, setDragId] = useState<number | null>(null);
    const [reorderPending, setReorderPending] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    const configById = useMemo(
        () => new Map(config.map((c) => [c.id, c])),
        [config],
    );

    const groupRank = useMemo(() => {
        // Rank by array position, not g.sortOrder: `groups` is already in
        // display order (including after optimistic reorders), while
        // sortOrder can be stale post-reorder or all-0 for never-reordered
        // groups, which would tie and interleave categories across groups.
        const m = new Map<number, number>();
        groups.forEach((g, i) => m.set(g.id, i));
        return m;
    }, [groups]);

    // The board: publicly visible categories, in public order.
    const boardRows = useMemo(() => {
        return rows
            .filter((r) => r.isMain && r.active)
            .sort((a, b) => {
                const ga =
                    a.groupId != null
                        ? (groupRank.get(a.groupId) ?? 0)
                        : Infinity;
                const gb =
                    b.groupId != null
                        ? (groupRank.get(b.groupId) ?? 0)
                        : Infinity;
                if (ga !== gb) return ga - gb;
                return (
                    effectiveSortKey(a.sortOrder) -
                        effectiveSortKey(b.sortOrder) ||
                    b.totalRunTime - a.totalRunTime
                );
            });
    }, [rows, groupRank]);

    const archivedRows = useMemo(() => rows.filter((r) => !r.active), [rows]);

    // `differs` is computed once for the whole board — never per row — and
    // over the featured scope only, matching what the table renders.
    const differs = useMemo(() => {
        const boardIds = new Set(boardRows.map((r) => r.id));
        return disagreementsByColumn(config.filter((c) => boardIds.has(c.id)));
    }, [config, boardRows]);

    // Share of the game's finished runs the board actually covers — the same
    // closing statement the setup wizard's step 2 makes.
    const share = activityShare(
        rows.map((r) => ({
            totalFinishedAttemptCount: r.totalFinishedAttemptCount,
            active: r.isMain && r.active,
        })),
    );

    // The wizard's suggested picks, offered only while the board has no
    // featured category at all — which is now also the table's empty state.
    // Once a moderator has curated even one, their judgement beats the
    // heuristic and this goes quiet for good.
    const suggested = useMemo(() => {
        if (boardRows.length > 0) return [];
        const ids = suggestFeaturedIds(
            rows
                .filter((r) => r.active)
                .map((r) => ({
                    id: r.id,
                    totalFinishedAttemptCount: r.totalFinishedAttemptCount,
                    uniqueRunners: r.uniqueRunners,
                })),
        );
        return rows.filter((r) => ids.has(r.id));
    }, [rows, boardRows]);

    const setPending = (id: number, pending: boolean) => {
        setPendingIds((prev) => {
            const next = new Set(prev);
            if (pending) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    // Applies a single Featured/Archived change via updateVisibilityAction —
    // shared by the row actions below and their Undo (which just calls this
    // again with the field flipped back to its previous value).
    const applyVisibility = async (
        categoryId: number,
        field: 'isMain' | 'active',
        value: boolean,
    ) =>
        updateVisibilityAction({
            gameSlug: game.name,
            gameId: game.id,
            categoryId,
            ...(field === 'isMain' ? { isMain: value } : {}),
            ...(field === 'active' ? { active: value } : {}),
        });

    const setVisibility = (
        row: ManageCategoryRow,
        field: 'isMain' | 'active',
        value: boolean,
    ) => {
        const prevValue = row[field];
        setPending(row.id, true);
        onRowChange(row.id, { [field]: value });
        startTransition(async () => {
            const res = await applyVisibility(row.id, field, value);
            setPending(row.id, false);
            if ('error' in res) {
                toast.error(res.error);
                onRowChange(row.id, { [field]: prevValue });
                return;
            }
            fireUndoToast(
                `${row.display}: ${toggleLabel(field, value)}.`,
                async () => {
                    const undoRes = await applyVisibility(
                        row.id,
                        field,
                        prevValue,
                    );
                    if ('error' in undoRes) return { error: undoRes.error };
                    onRowChange(row.id, { [field]: prevValue });
                    return { ok: true };
                },
                // No extra resync needed on undo — the undo callback above
                // already reverts the row via onRowChange.
                () => undefined,
            );
        });
    };

    const onChangeGroup = (row: ManageCategoryRow, raw: string) => {
        if (raw === '__create__') {
            setGroupPromptRow(row);
            return;
        }

        const nextGroupId = raw === '' ? null : Number.parseInt(raw, 10);
        const nextGroup = nextGroupId
            ? (groups.find((g) => g.id === nextGroupId) ?? null)
            : null;
        const prevGroupId = row.groupId ?? null;
        const prevGroupName = row.groupName ?? null;

        onRowGroupChange(row.id, nextGroupId, nextGroup?.name ?? null);
        setPending(row.id, true);
        startTransition(async () => {
            const res = await assignCategoryGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                categoryId: row.id,
                groupId: nextGroupId,
            });
            setPending(row.id, false);
            if ('error' in res) {
                toast.error(res.error);
                onRowGroupChange(row.id, prevGroupId, prevGroupName);
                return;
            }
            toast.success(
                nextGroup
                    ? `${row.display} → ${nextGroup.name}`
                    : `${row.display} → Ungrouped`,
            );
        });
    };

    const submitGroupPrompt = async (name: string) => {
        const row = groupPromptRow;
        if (!row) return;
        setGroupPromptPending(true);
        setGroupPromptError(null);
        const create = await createGroupAction({
            gameSlug: game.name,
            gameId: game.id,
            name,
        });
        if ('error' in create) {
            setGroupPromptPending(false);
            setGroupPromptError(create.error);
            return;
        }
        const newGroupId = create.result.id;
        onGroupCreated({
            id: newGroupId,
            name,
            sortOrder: (groups[groups.length - 1]?.sortOrder ?? 0) + 1,
            hiddenByDefault: false,
            displayMode: null,
        });

        setPending(row.id, true);
        const assign = await assignCategoryGroupAction({
            gameSlug: game.name,
            gameId: game.id,
            categoryId: row.id,
            groupId: newGroupId,
        });
        setPending(row.id, false);
        if ('error' in assign) {
            toast.error(assign.error);
        } else {
            onRowGroupChange(row.id, newGroupId, name);
            toast.success(`Created "${name}" and moved ${row.display}`);
        }

        setGroupPromptPending(false);
        setGroupPromptRow(null);
    };

    // The moved row's ordering scope: its own group, within the board. This
    // matches the public scope exactly, and with no filters or search left on
    // this screen the scope is always fully visible — reorder can no longer
    // renumber rows the moderator can't see.
    const scopeOf = (row: ManageCategoryRow) =>
        boardRows.filter((r) => (r.groupId ?? null) === (row.groupId ?? null));

    const commitReorder = (row: ManageCategoryRow, toIndex: number) => {
        const scope = scopeOf(row);
        const fromIndex = scope.findIndex((r) => r.id === row.id);
        const { changes } = computeReorderChanges(scope, fromIndex, toIndex);
        if (changes.length === 0) return;
        const prev = scope.map((r) => ({
            categoryId: r.id,
            sortOrder: r.sortOrder,
        }));
        onRowsReorder(changes);
        setReorderPending(true);
        startTransition(async () => {
            const res = await reorderCategoriesAction({
                gameSlug: game.name,
                gameId: game.id,
                changes,
            });
            setReorderPending(false);
            if ('error' in res) {
                toast.error(res.error);
                // Writes that landed before the failure are real — only
                // revert rows the backend never actually touched; blind-
                // reverting everything would lie about applied changes.
                const appliedIds = new Set(
                    res.applied.map((c) => c.categoryId),
                );
                onRowsReorder(
                    prev.filter((c) => !appliedIds.has(c.categoryId)),
                );
            }
        });
    };

    const moveBy = (row: ManageCategoryRow, delta: -1 | 1) => {
        const scope = scopeOf(row);
        const idx = scope.findIndex((r) => r.id === row.id);
        const target = idx + delta;
        if (idx < 0 || target < 0 || target >= scope.length) return;
        commitReorder(row, target);
    };

    const onDropRow = (overRow: ManageCategoryRow) => {
        if (dragId === null || dragId === overRow.id) {
            setDragId(null);
            return;
        }
        const dragged = boardRows.find((r) => r.id === dragId);
        setDragId(null);
        if (!dragged) return;
        // Cross-group drops are ignored — group membership has its own control.
        if ((dragged.groupId ?? null) !== (overRow.groupId ?? null)) return;
        const scope = scopeOf(dragged);
        const toIndex = scope.findIndex((r) => r.id === overRow.id);
        if (toIndex < 0) return;
        commitReorder(dragged, toIndex);
    };

    return (
        <section className="mb-4">
            {/* A board with nothing featured has an empty public band — the
                one state where this screen should say something rather than
                wait. The wizard's step 2 pre-ticks its picks; a live-write
                screen must not, so it offers them instead. */}
            {suggested.length > 0 && (
                <div
                    className="alert alert-info d-flex flex-wrap align-items-center gap-2 py-2"
                    role="status"
                >
                    <span>
                        Nothing is on the board yet, so the public page shows no
                        categories. Busiest here:{' '}
                        <strong>
                            {suggested.map((r) => r.display).join(', ')}
                        </strong>
                        .
                    </span>
                    <button
                        type="button"
                        className="btn btn-sm btn-primary ms-auto"
                        disabled={pendingIds.size > 0}
                        onClick={() => {
                            for (const r of suggested)
                                setVisibility(r, 'isMain', true);
                        }}
                    >
                        Add {suggested.length === 1 ? 'it' : 'them'}
                    </button>
                </div>
            )}

            {boardRows.length === 0 ? (
                <p className="text-muted my-4">
                    No categories on the board. Use “Add category to board” to
                    put one there.
                </p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-sm align-middle">
                        <thead>
                            <tr>
                                <th style={{ width: 70 }}>Order</th>
                                <th>Category</th>
                                <th>Group</th>
                                <th>Activity</th>
                                <th className="text-end">Runners</th>
                                <th className="text-end">Runs</th>
                                <th className="text-end">Playtime</th>
                                <th className="text-center">Timing</th>
                                <th className="text-end">Minimum</th>
                                <th className="text-center">Rules</th>
                                <th className="text-end">Sub-boards</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {boardRows.map((row) => {
                                const isPending = pendingIds.has(row.id);
                                return (
                                    <tr
                                        key={row.id}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => onDropRow(row)}
                                    >
                                        <td>
                                            <div className="d-flex align-items-center gap-1">
                                                <span
                                                    aria-hidden="true"
                                                    title="Drag to reorder"
                                                    draggable={!reorderPending}
                                                    onDragStart={() =>
                                                        setDragId(row.id)
                                                    }
                                                    onDragEnd={() =>
                                                        setDragId(null)
                                                    }
                                                    style={{ cursor: 'grab' }}
                                                    className={
                                                        dragId === row.id
                                                            ? 'opacity-50'
                                                            : ''
                                                    }
                                                >
                                                    ⠿
                                                </span>
                                                <div
                                                    className="btn-group btn-group-sm"
                                                    role="group"
                                                    aria-label="Reorder"
                                                >
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary"
                                                        onClick={() =>
                                                            moveBy(row, -1)
                                                        }
                                                        disabled={
                                                            reorderPending
                                                        }
                                                        aria-label="Move up"
                                                    >
                                                        ▲
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary"
                                                        onClick={() =>
                                                            moveBy(row, 1)
                                                        }
                                                        disabled={
                                                            reorderPending
                                                        }
                                                        aria-label="Move down"
                                                    >
                                                        ▼
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{row.display}</td>
                                        <td>
                                            <select
                                                className="form-select form-select-sm"
                                                value={
                                                    row.groupId == null
                                                        ? ''
                                                        : String(row.groupId)
                                                }
                                                disabled={isPending}
                                                onChange={(e) =>
                                                    onChangeGroup(
                                                        row,
                                                        e.target.value,
                                                    )
                                                }
                                                style={{ minWidth: 160 }}
                                                aria-label={`Group: ${row.display}`}
                                            >
                                                <option value="">
                                                    Ungrouped
                                                </option>
                                                {groups.map((g) => (
                                                    <option
                                                        key={g.id}
                                                        value={String(g.id)}
                                                    >
                                                        {g.name}
                                                    </option>
                                                ))}
                                                <option value="__create__">
                                                    + Create group…
                                                </option>
                                            </select>
                                        </td>
                                        <td>
                                            <ActivityCell
                                                runners={row.uniqueRunners}
                                                max={Math.max(
                                                    1,
                                                    ...boardRows.map(
                                                        (r) => r.uniqueRunners,
                                                    ),
                                                )}
                                            />
                                        </td>
                                        <td className="text-end">
                                            {formatCount(row.uniqueRunners)}
                                        </td>
                                        <td className="text-end">
                                            {formatCount(
                                                row.totalFinishedAttemptCount,
                                            )}
                                        </td>
                                        <td className="text-end">
                                            {formatHours(row.totalRunTime)}h
                                        </td>
                                        <ConfigCells
                                            cfg={configById.get(row.id)}
                                            differs={differs}
                                        />
                                        <td className="text-end text-nowrap">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-link"
                                                onClick={() => onEdit(row.id)}
                                            >
                                                Edit →
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-link text-secondary"
                                                disabled={isPending}
                                                onClick={() =>
                                                    setVisibility(
                                                        row,
                                                        'isMain',
                                                        false,
                                                    )
                                                }
                                                title="Takes this category off the public board. Runs are kept."
                                            >
                                                Remove
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-link text-secondary"
                                                disabled={isPending}
                                                onClick={() =>
                                                    setVisibility(
                                                        row,
                                                        'active',
                                                        false,
                                                    )
                                                }
                                                title="Hides the category and its boards everywhere. Runs are kept."
                                            >
                                                Archive
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className={styles.coverageRow}>
                <div className="text-muted small">
                    {boardRows.length} on the board · {share}% of finished runs
                    covered
                </div>
                <div
                    className={styles.meter}
                    role="progressbar"
                    aria-label="Share of finished runs covered by the board"
                    aria-valuenow={share}
                    aria-valuemin={0}
                    aria-valuemax={100}
                >
                    <div
                        className={styles.meterFill}
                        style={{ width: `${share}%` }}
                    />
                </div>
            </div>

            {archivedRows.length > 0 && (
                <div className="mt-3">
                    <button
                        type="button"
                        className={styles.archivedToggle}
                        aria-expanded={showArchived}
                        onClick={() => setShowArchived((v) => !v)}
                    >
                        {archivedRows.length} archived categor
                        {archivedRows.length === 1 ? 'y' : 'ies'}{' '}
                        {showArchived ? '▴' : '▾'}
                    </button>
                    {showArchived && (
                        <ul className={styles.archivedList}>
                            {archivedRows.map((row) => (
                                <li
                                    key={row.id}
                                    className={styles.archivedItem}
                                >
                                    <span className={styles.archivedName}>
                                        {row.display}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-link"
                                        disabled={pendingIds.has(row.id)}
                                        onClick={() =>
                                            setVisibility(row, 'active', true)
                                        }
                                    >
                                        Restore
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <p className="text-muted small mt-3 mb-0">
                Only the categories listed here appear on the public game page,
                in this order. Removing one takes it off the board but keeps its
                runs and leaves it available to add back. Archiving hides the
                category and its boards everywhere.
            </p>

            <PromptDialog
                open={groupPromptRow != null}
                onClose={() => {
                    setGroupPromptRow(null);
                    setGroupPromptError(null);
                }}
                onSubmit={submitGroupPrompt}
                labelledBy="create-group-title"
                title="Create category group"
                blurb={
                    groupPromptRow
                        ? `Creates a new group and moves ${groupPromptRow.display} into it.`
                        : undefined
                }
                fieldLabel="Group name"
                placeholder="e.g. Any% category extensions"
                minLength={1}
                submitLabel="Create group"
                pending={groupPromptPending}
                error={groupPromptError}
            />
        </section>
    );
}

/** Runner-count bar, same vocabulary (and same signal) as setup's step 2. */
function ActivityCell({ runners, max }: { runners: number; max: number }) {
    return (
        <div className={styles.activityBar}>
            <div
                className={styles.activityFill}
                style={{
                    width: `${Math.max(2, Math.round((runners / max) * 100))}%`,
                }}
            />
        </div>
    );
}

/**
 * The four configuration columns. Split out so the row body stays readable;
 * `differs` is precomputed for the whole board by the caller.
 */
function ConfigCells({
    cfg,
    differs,
}: {
    cfg: CategoryConfigRow | undefined;
    differs: ReturnType<typeof disagreementsByColumn>;
}) {
    if (!cfg) {
        return (
            <>
                <td className="text-center text-muted">—</td>
                <td className="text-end text-muted">—</td>
                <td className="text-center text-muted">—</td>
                <td className="text-end text-muted">—</td>
            </>
        );
    }
    return (
        <>
            <td className="text-center">
                {cfg.timing === 'gametime'
                    ? cfg.gameTimeLabel === 'lrt'
                        ? 'LRT'
                        : 'IGT'
                    : 'RTA'}
                <Outlier on={differs.timing.has(cfg.id)} />
            </td>
            <td className="text-end">
                {formatMinimum(cfg.minTimeMs)}
                <Outlier on={differs.minimum.has(cfg.id)} />
            </td>
            <td className="text-center">
                {cfg.hasRules ? '✓' : '—'}
                <Outlier on={differs.rules.has(cfg.id)} />
            </td>
            <td className="text-end">
                {cfg.subBoards}
                <Outlier on={differs.subBoards.has(cfg.id)} />
            </td>
        </>
    );
}

function Outlier({ on }: { on: boolean }) {
    if (!on) return null;
    return (
        <span
            className={`ms-1 ${styles.outlier}`}
            title="Differs from the rest of the board"
            aria-label="differs from the rest of the board"
        >
            {'▲'}
        </span>
    );
}

/** Board minimum as h:mm:ss / m:ss. Null renders as unset, never as 0. */
export function formatMinimum(ms: number | null): string {
    if (ms == null) return '—';
    const total = Math.round(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
