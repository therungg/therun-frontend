'use client';

import { Fragment, useMemo, useState, useTransition } from 'react';
import {
    CaretDownFill,
    CaretUpFill,
    Check2,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    CircleFill,
    Dash,
    GripVertical,
    ListUl,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { assignCategoryGroupAction } from '~src/actions/category-group/assign-category-group.action';
import { createGroupAction } from '~src/actions/category-group/create-group.action';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import {
    type CategoryConfigRow,
    disagreementsByColumn,
} from '~src/lib/console/category-rows';
import { splitLevelBoards } from '~src/lib/levels/display';
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
 * That cut is also what makes the configuration columns readable: an amber dot
 * marks a category that differs from the rest of the board, which means
 * something across eight peers and nothing at all across nine hundred.
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

    // Level boards never enter this table: one per level per level category,
    // they follow their template — order, grouping and featuring are all
    // decided there — and are managed entirely from the Levels sidebar.
    // Splitting first keeps every memo below full-game only, including the
    // reorder scope, the disagreement scan and the suggestions.
    const { fullGame: fullGameRows } = useMemo(
        () => splitLevelBoards(rows, groups),
        [rows, groups],
    );

    // The board: publicly visible categories, in public order.
    const boardRows = useMemo(() => {
        return fullGameRows
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
    }, [fullGameRows, groupRank]);

    // Consecutive runs of one group, in board order — `boardRows` is already
    // sorted by group rank, so a band is just a run of equal groupIds. The
    // band row carries the group's identity, which is what lets the per-row
    // group control go quiet.
    const bands = useMemo(() => {
        const out: Array<{
            key: string;
            name: string;
            rows: ManageCategoryRow[];
        }> = [];
        for (const row of boardRows) {
            const key = row.groupId == null ? 'ungrouped' : String(row.groupId);
            const last = out[out.length - 1];
            if (last?.key === key) {
                last.rows.push(row);
                continue;
            }
            out.push({
                key,
                name: row.groupName ?? 'Ungrouped',
                rows: [row],
            });
        }
        return out;
    }, [boardRows]);

    const archivedRows = useMemo(
        () => fullGameRows.filter((r) => !r.active),
        [fullGameRows],
    );

    // Groups a full-game category may be moved into. Level groups are not
    // among them: membership of a level is what makes a board a level board,
    // and that is granted by pushing a level category, never by hand.
    const groupOptions = useMemo(
        () => groups.filter((g) => g.kind !== 'level'),
        [groups],
    );

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
            fullGameRows
                .filter((r) => r.active)
                .map((r) => ({
                    id: r.id,
                    totalFinishedAttemptCount: r.totalFinishedAttemptCount,
                    uniqueRunners: r.uniqueRunners,
                })),
        );
        return fullGameRows.filter((r) => ids.has(r.id));
    }, [fullGameRows, boardRows]);

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
            kind: 'normal',
            rules: null,
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

    const maxRunners = Math.max(1, ...boardRows.map((r) => r.uniqueRunners));

    return (
        <section>
            {boardRows.length === 0 && (
                <div className={styles.panel}>
                    {/* A board with nothing on it renders an empty public band
                        — the one state where this screen should say something
                        rather than wait. The wizard's step 2 pre-ticks its
                        picks; a live-write screen must not, so it offers. */}
                    <div className={styles.empty}>
                        <ListUl
                            size={28}
                            className={styles.emptyIcon}
                            aria-hidden="true"
                        />
                        <p className={styles.emptyTitle}>
                            Nothing on the board yet
                        </p>
                        {suggested.length > 0 ? (
                            <>
                                <p className="mb-0">
                                    The public page shows no categories until
                                    one is here.
                                </p>
                                <div
                                    className={styles.suggestion}
                                    role="status"
                                >
                                    <span>
                                        Busiest:{' '}
                                        <span
                                            className={styles.suggestionNames}
                                        >
                                            {suggested
                                                .map((r) => r.display)
                                                .join(', ')}
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.primaryAction}
                                        disabled={pendingIds.size > 0}
                                        onClick={() => {
                                            for (const r of suggested)
                                                setVisibility(
                                                    r,
                                                    'isMain',
                                                    true,
                                                );
                                        }}
                                    >
                                        Add{' '}
                                        {suggested.length === 1 ? 'it' : 'them'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="mb-0">
                                Use “Add category to board” to put one there.
                            </p>
                        )}
                    </div>
                </div>
            )}
            {boardRows.length > 0 && (
                <div className={styles.panel}>
                    <div className="table-responsive">
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: '4.5rem' }}>Order</th>
                                    <th>Category</th>
                                    <th>Group</th>
                                    <th className="text-end">Runners</th>
                                    <th className="text-end">Runs</th>
                                    <th className="text-end">Playtime</th>
                                    <th className={styles.zoneStart}>Timing</th>
                                    <th className="text-end">Minimum</th>
                                    <th className="text-center">Rules</th>
                                    <th className="text-end">Boards</th>
                                    <th className={styles.zoneStart} />
                                </tr>
                            </thead>
                            <tbody>
                                {bands.map((band) => (
                                    <Fragment key={band.key}>
                                        {/* The public board renders a group as
                                            a recessed well; a table can't, so
                                            the group becomes a band row. */}
                                        <tr className={styles.groupRow}>
                                            <td colSpan={11}>
                                                <span
                                                    className={
                                                        styles.groupLabel
                                                    }
                                                >
                                                    {band.name}
                                                </span>
                                                <span
                                                    className={
                                                        styles.groupCount
                                                    }
                                                >
                                                    {band.rows.length}
                                                </span>
                                            </td>
                                        </tr>
                                        {band.rows.map((row, i) => {
                                            const isPending = pendingIds.has(
                                                row.id,
                                            );
                                            const cfg = configById.get(row.id);
                                            return (
                                                <tr
                                                    key={row.id}
                                                    onDragOver={(e) =>
                                                        e.preventDefault()
                                                    }
                                                    onDrop={() =>
                                                        onDropRow(row)
                                                    }
                                                >
                                                    <td>
                                                        <div
                                                            className={
                                                                styles.orderCell
                                                            }
                                                        >
                                                            <span
                                                                aria-hidden="true"
                                                                title="Drag to reorder"
                                                                draggable={
                                                                    !reorderPending
                                                                }
                                                                onDragStart={() =>
                                                                    setDragId(
                                                                        row.id,
                                                                    )
                                                                }
                                                                onDragEnd={() =>
                                                                    setDragId(
                                                                        null,
                                                                    )
                                                                }
                                                                className={`${styles.grip} ${
                                                                    dragId ===
                                                                    row.id
                                                                        ? styles.gripDragging
                                                                        : ''
                                                                }`}
                                                            >
                                                                <GripVertical
                                                                    size={14}
                                                                />
                                                            </span>
                                                            <span
                                                                className={
                                                                    styles.rank
                                                                }
                                                            >
                                                                {i + 1}
                                                            </span>
                                                            <span
                                                                className={
                                                                    styles.orderArrows
                                                                }
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className={
                                                                        styles.orderBtn
                                                                    }
                                                                    onClick={() =>
                                                                        moveBy(
                                                                            row,
                                                                            -1,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        reorderPending ||
                                                                        i === 0
                                                                    }
                                                                    aria-label={`Move ${row.display} up`}
                                                                >
                                                                    <CaretUpFill
                                                                        size={9}
                                                                    />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className={
                                                                        styles.orderBtn
                                                                    }
                                                                    onClick={() =>
                                                                        moveBy(
                                                                            row,
                                                                            1,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        reorderPending ||
                                                                        i ===
                                                                            band
                                                                                .rows
                                                                                .length -
                                                                                1
                                                                    }
                                                                    aria-label={`Move ${row.display} down`}
                                                                >
                                                                    <CaretDownFill
                                                                        size={9}
                                                                    />
                                                                </button>
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className={styles.name}>
                                                        {row.display}
                                                    </td>
                                                    <td>
                                                        <select
                                                            className={
                                                                styles.groupSelect
                                                            }
                                                            value={
                                                                row.groupId ==
                                                                null
                                                                    ? ''
                                                                    : String(
                                                                          row.groupId,
                                                                      )
                                                            }
                                                            disabled={isPending}
                                                            onChange={(e) =>
                                                                onChangeGroup(
                                                                    row,
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            aria-label={`Group: ${row.display}`}
                                                        >
                                                            <option value="">
                                                                Ungrouped
                                                            </option>
                                                            {groupOptions.map(
                                                                (g) => (
                                                                    <option
                                                                        key={
                                                                            g.id
                                                                        }
                                                                        value={String(
                                                                            g.id,
                                                                        )}
                                                                    >
                                                                        {g.name}
                                                                    </option>
                                                                ),
                                                            )}
                                                            <option value="__create__">
                                                                + Create group…
                                                            </option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <div
                                                            className={
                                                                styles.runnersCell
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.num
                                                                }
                                                            >
                                                                {formatCount(
                                                                    row.uniqueRunners,
                                                                )}
                                                            </span>
                                                            <span
                                                                className={
                                                                    styles.bar
                                                                }
                                                                aria-hidden="true"
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.barFill
                                                                    }
                                                                    style={{
                                                                        width: `${Math.max(
                                                                            4,
                                                                            Math.round(
                                                                                (row.uniqueRunners /
                                                                                    maxRunners) *
                                                                                    100,
                                                                            ),
                                                                        )}%`,
                                                                    }}
                                                                />
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className={styles.num}>
                                                        {formatCount(
                                                            row.totalFinishedAttemptCount,
                                                        )}
                                                    </td>
                                                    <td
                                                        className={
                                                            styles.numMuted
                                                        }
                                                    >
                                                        {formatHours(
                                                            row.totalRunTime,
                                                        )}
                                                        h
                                                    </td>
                                                    <ConfigCells
                                                        cfg={cfg}
                                                        differs={differs}
                                                    />
                                                    <td
                                                        className={
                                                            styles.zoneStart
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                styles.actions
                                                            }
                                                        >
                                                            <button
                                                                type="button"
                                                                className={`${styles.quietAction} ${styles.removeAction}`}
                                                                disabled={
                                                                    isPending
                                                                }
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
                                                                className={
                                                                    styles.quietAction
                                                                }
                                                                disabled={
                                                                    isPending
                                                                }
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
                                                            <button
                                                                type="button"
                                                                className={
                                                                    styles.editLink
                                                                }
                                                                onClick={() =>
                                                                    onEdit(
                                                                        row.id,
                                                                    )
                                                                }
                                                            >
                                                                Edit
                                                                <ChevronRight
                                                                    size={11}
                                                                    aria-hidden="true"
                                                                />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.coverage}>
                        <span className={styles.coverageLabel}>
                            Board coverage
                        </span>
                        <span className={styles.coverageValue}>{share}%</span>
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
                        <span className={styles.coverageNote}>
                            {boardRows.length} categor
                            {boardRows.length === 1 ? 'y carries' : 'ies carry'}{' '}
                            {share}% of this game's finished runs
                        </span>
                    </div>
                </div>
            )}

            <div className={styles.footRow}>
                <p className={styles.note}>
                    Only these categories appear on the public game page, in
                    this order. Remove takes one off the board but keeps its
                    runs. Archive hides the category and its boards everywhere.
                </p>
                {archivedRows.length > 0 && (
                    <div>
                        <button
                            type="button"
                            className={styles.archivedToggle}
                            aria-expanded={showArchived}
                            onClick={() => setShowArchived((v) => !v)}
                        >
                            {archivedRows.length} archived categor
                            {archivedRows.length === 1 ? 'y' : 'ies'}
                            {showArchived ? (
                                <ChevronUp size={10} aria-hidden="true" />
                            ) : (
                                <ChevronDown size={10} aria-hidden="true" />
                            )}
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
                                            className={`${styles.quietAction} ${styles.restoreAction}`}
                                            disabled={pendingIds.has(row.id)}
                                            onClick={() =>
                                                setVisibility(
                                                    row,
                                                    'active',
                                                    true,
                                                )
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
            </div>

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

/**
 * The four configuration columns — the zone a moderator scans for the odd one
 * out. Split out so the row body stays readable; `differs` is precomputed for
 * the whole board by the caller.
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
                <td className={styles.zoneStart}>
                    <Missing />
                </td>
                <td className="text-end">
                    <Missing />
                </td>
                <td className="text-center">
                    <Missing />
                </td>
                <td className="text-end">
                    <Missing />
                </td>
            </>
        );
    }
    return (
        <>
            <td className={styles.zoneStart}>
                <span className={styles.timing}>
                    {cfg.timing === 'gametime'
                        ? cfg.gameTimeLabel === 'lrt'
                            ? 'LRT'
                            : 'IGT'
                        : 'RTA'}
                </span>
                <Outlier on={differs.timing.has(cfg.id)} />
            </td>
            <td className={styles.num}>
                {cfg.minTimeMs == null ? (
                    <Missing />
                ) : (
                    formatMinimum(cfg.minTimeMs)
                )}
                <Outlier on={differs.minimum.has(cfg.id)} />
            </td>
            <td className="text-center">
                {cfg.hasRules ? (
                    <Check2
                        size={14}
                        className={styles.check}
                        aria-label="has rules"
                    />
                ) : (
                    <Missing />
                )}
                <Outlier on={differs.rules.has(cfg.id)} />
            </td>
            <td className={styles.numMuted}>
                {cfg.subBoards}
                <Outlier on={differs.subBoards.has(cfg.id)} />
            </td>
        </>
    );
}

/** Unset / unknown, as a glyph-free dash. */
function Missing() {
    return <Dash size={14} className={styles.dash} aria-label="not set" />;
}

/**
 * "Differs from the rest of the board" — a dot, not a warning sign.
 * Deliberately quiet: it flags a difference, it does not assert a problem.
 */
function Outlier({ on }: { on: boolean }) {
    if (!on) return null;
    return (
        <CircleFill
            size={5}
            className={styles.outlier}
            aria-label="differs from the rest of the board"
        />
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
