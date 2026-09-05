'use client';

import { useMemo, useState, useTransition } from 'react';
import { ListUl, Plus } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { assignCategoryGroupAction } from '~src/actions/category-group/assign-category-group.action';
import { createGroupAction } from '~src/actions/category-group/create-group.action';
import styles from '~src/components/console-chrome/console.module.scss';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import { previewCategories } from '~src/lib/console/preview-categories';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { GameMetadata } from '~src/lib/game-mgmt';
import { splitLevelBoards } from '~src/lib/levels/display';
import {
    findGameMinPolicy,
    minMsFromPolicy,
} from '~src/lib/setup/game-minimum';
import { activityShare, suggestFeaturedIds } from '~src/lib/setup/suggestions';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import { buildCategorySeed } from '../../setup/steps/category-seed';
import { CategoryMatrix } from '../../setup/steps/matrix/category-matrix';
import { PromptDialog } from '../../shared/prompt-dialog';
import { reorderCategoriesAction } from '../game-tab/actions/reorder-categories.action';
import type { ReorderChange } from '../game-tab/reorder-changes';
import { computeReorderChanges } from '../game-tab/reorder-changes';
import { fireUndoToast } from '../moderation/shared/undo-toast';
import { updateVisibilityAction } from '../visibility/actions/update-visibility.action';
import { AddCategoryDialog } from './add-category-dialog';
import boardStyles from './board-categories.module.scss';

interface Props {
    game: ResolvedGame;
    rows: ManageCategoryRow[];
    groups: ManageGroup[];
    /** Server snapshot of the categories; `rows` carries the live flags. */
    boardCategories: ResolvedCategory[];
    policies: BoardPolicyRow[];
    /** Feeds the grid's subcategory count. */
    variables: VariableRow[];
    /** Game defaults seeded onto a category as it joins the board, and the
     *  values the matrix renders deviations from. Absent for viewers whose
     *  console didn't load game details. */
    metadata?: GameMetadata | null;
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
    onGroupsChange: (groups: ManageGroup[]) => void;
    onEditCategory: (categoryId: number) => void;
}

/**
 * The board's category list — "what is on my board, where does it disagree
 * with the defaults, and can I fix that here?"
 *
 * This renders the setup wizard's step-4 matrix, not a table of its own. The
 * two screens were asking the same question in two vocabularies: the wizard let
 * a mod set timing, minimum, rules and precision in place, while the console
 * printed the same values as read-only text and sent them to a route per
 * category to change one. A moderator working down a board loses their place on
 * every such trip, and the two screens drifted apart every time either was
 * touched. One component now answers for both.
 *
 * What the console adds on top is structure — rank, group, membership — which
 * the wizard has no business showing (it decided all three in earlier steps).
 * That is the matrix's optional `structure` prop, and this pane owns every
 * write behind it, because the console's optimistic rows, not the server
 * snapshot, are what the table is showing at any moment.
 */
export function CategoriesPane({
    game,
    rows,
    groups,
    boardCategories,
    policies,
    variables,
    metadata,
    onRowChange,
    onRowGroupChange,
    onRowsReorder,
    onGroupsChange,
    onEditCategory,
}: Props) {
    const [addOpen, setAddOpen] = useState(false);
    const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
    const [reorderPending, setReorderPending] = useState(false);
    const [groupPromptRow, setGroupPromptRow] =
        useState<ManageCategoryRow | null>(null);
    const [groupPromptPending, setGroupPromptPending] = useState(false);
    const [groupPromptError, setGroupPromptError] = useState<string | null>(
        null,
    );
    const [_isPending, startTransition] = useTransition();

    // Level boards never enter this pane: one per level per level category,
    // they follow their template — order, grouping and featuring are all
    // decided there — and are managed entirely from the Levels sidebar.
    // Splitting first keeps every derived value below full-game only,
    // including the reorder scope, the add pool and the suggestions.
    const { fullGame: fullGameRows } = useMemo(
        () => splitLevelBoards(rows, groups),
        [rows, groups],
    );

    // The board, as the matrix should draw it right now: the server snapshot
    // for everything the matrix reads (rules, timing, milliseconds), with the
    // four flags this pane can change overlaid from the live rows, so an
    // optimistic remove or regroup lands before the refresh does.
    const matrixCategories = useMemo(() => {
        const fullGameIds = new Set(fullGameRows.map((r) => r.id));
        return previewCategories(boardCategories, rows).filter((c) =>
            fullGameIds.has(c.id),
        );
    }, [boardCategories, rows, fullGameRows]);

    // Groups a full-game category may be moved into. Level groups are not
    // among them: membership of a level is what makes a board a level board,
    // and that is granted by pushing a level category, never by hand.
    const groupOptions = useMemo(
        () => groups.filter((g) => g.kind !== 'level'),
        [groups],
    );

    // The same list is what the matrix sections by — level groups are absent
    // from this screen entirely, not merely empty on it, because every level
    // board has already been filtered out of the rows above and a group is
    // only ever a heading over its rows. They would also count toward
    // `sectionsFor`'s flatten-when-trivial test, un-flattening a one-group
    // board that happens to have levels.
    //
    // Position, not stored sortOrder: the live `groups` array is already in
    // display order (including after an optimistic reorder) and carries groups
    // created in this session that the snapshot has never seen, while their
    // stored sortOrder can be stale, or all-0 and tie.
    const matrixGroups = useMemo<ResolvedGroup[]>(
        () => groupOptions.map((g, i) => ({ ...g, sortOrder: i })),
        [groupOptions],
    );

    // The board's rows, in the same order the matrix draws them — the scope a
    // reorder renumbers.
    const boardRows = useMemo(
        () =>
            matrixCategories
                .map((c) => fullGameRows.find((r) => r.id === c.id))
                .filter((r): r is ManageCategoryRow => r != null),
        [matrixCategories, fullGameRows],
    );

    // Everything with runs that isn't on the board — the add dialog's pool.
    // Archived categories are excluded: they have their own restore path
    // under the table, and adding one would feature something the board
    // refuses to render. Everything in a level group is excluded too — level
    // boards are featured by their level category, and featuring one here
    // would drift it from the template the next push overwrites. Membership
    // of a level is the test, not `levelTemplateId`: a level-only row (in a
    // level group with no template) is just as much not-a-full-game-board.
    const pool = useMemo(
        () => fullGameRows.filter((r) => !r.isMain && r.active),
        [fullGameRows],
    );

    // Share of the game's finished runs the board actually covers — the same
    // closing statement the setup wizard's step 2 makes.
    const share = activityShare(
        rows.map((r) => ({
            totalFinishedAttemptCount: r.totalFinishedAttemptCount,
            active: r.isMain && r.active,
        })),
    );

    // The wizard's suggested picks, offered only while the board has no
    // featured category at all — which is now also the pane's empty state.
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

    const seed = metadata ? buildCategorySeed(metadata) : null;

    const setBusy = (id: number, busy: boolean) => {
        setBusyIds((prev) => {
            const next = new Set(prev);
            if (busy) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    // Applies a single Featured change — shared by Remove and its Undo, which
    // is just this again with the flag flipped back.
    const applyVisibility = async (categoryId: number, value: boolean) =>
        updateVisibilityAction({
            gameSlug: game.name,
            gameId: game.id,
            categoryId,
            isMain: value,
        });

    const setVisibility = (row: ManageCategoryRow, value: boolean) => {
        const prevValue = row.isMain;
        setBusy(row.id, true);
        onRowChange(row.id, { isMain: value });
        startTransition(async () => {
            const res = await applyVisibility(row.id, value);
            setBusy(row.id, false);
            if ('error' in res) {
                toast.error(res.error);
                onRowChange(row.id, { isMain: prevValue });
                return;
            }
            fireUndoToast(
                `${row.display}: ${
                    value ? 'featured' : 'removed from the board'
                }.`,
                async () => {
                    const undoRes = await applyVisibility(row.id, prevValue);
                    if ('error' in undoRes) return { error: undoRes.error };
                    onRowChange(row.id, { isMain: prevValue });
                    return { ok: true };
                },
                // No extra resync needed on undo — the undo callback above
                // already reverts the row via onRowChange.
                () => undefined,
            );
        });
    };

    const onGroupChange = (categoryId: number, raw: string) => {
        const row = fullGameRows.find((r) => r.id === categoryId);
        if (!row) return;
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
        setBusy(row.id, true);
        startTransition(async () => {
            const res = await assignCategoryGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                categoryId: row.id,
                groupId: nextGroupId,
            });
            setBusy(row.id, false);
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
        onGroupsChange([
            ...groups,
            {
                id: newGroupId,
                name,
                sortOrder: (groups[groups.length - 1]?.sortOrder ?? 0) + 1,
                hiddenByDefault: false,
                displayMode: null,
                kind: 'normal',
                rules: null,
            },
        ]);

        setBusy(row.id, true);
        const assign = await assignCategoryGroupAction({
            gameSlug: game.name,
            gameId: game.id,
            categoryId: row.id,
            groupId: newGroupId,
        });
        setBusy(row.id, false);
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
    // matches the public scope exactly, and with no filters or search on this
    // screen the scope is always fully visible — reorder can no longer
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

    const moveBy = (categoryId: number, delta: -1 | 1) => {
        const row = boardRows.find((r) => r.id === categoryId);
        if (!row) return;
        const scope = scopeOf(row);
        const idx = scope.findIndex((r) => r.id === row.id);
        const target = idx + delta;
        if (idx < 0 || target < 0 || target >= scope.length) return;
        commitReorder(row, target);
    };

    const onDropRow = (draggedId: number, overId: number) => {
        const dragged = boardRows.find((r) => r.id === draggedId);
        const over = boardRows.find((r) => r.id === overId);
        if (!dragged || !over) return;
        // Cross-group drops are ignored — group membership has its own control.
        if ((dragged.groupId ?? null) !== (over.groupId ?? null)) return;
        const scope = scopeOf(dragged);
        const toIndex = scope.findIndex((r) => r.id === over.id);
        if (toIndex < 0) return;
        commitReorder(dragged, toIndex);
    };

    return (
        <section className={styles.surface}>
            <header className={styles.paneHeader}>
                <div>
                    <div className={styles.paneEyebrow}>Structure</div>
                    <h2 className={styles.paneTitle}>
                        {CONCEPT_LABEL.categories}
                    </h2>
                </div>
                <div className={styles.paneActions}>
                    <button
                        type="button"
                        className={boardStyles.primaryAction}
                        onClick={() => setAddOpen(true)}
                    >
                        <Plus size={16} aria-hidden="true" />
                        Add category
                    </button>
                </div>
            </header>
            {boardRows.length === 0 ? (
                <div className={boardStyles.panel}>
                    {/* A board with nothing on it renders an empty public band
                        — the one state where this screen should say something
                        rather than wait. The wizard's step 2 pre-ticks its
                        picks; a live-write screen must not, so it offers. */}
                    <div className={boardStyles.empty}>
                        <ListUl
                            size={28}
                            className={boardStyles.emptyIcon}
                            aria-hidden="true"
                        />
                        <p className={boardStyles.emptyTitle}>
                            Nothing on the board yet
                        </p>
                        {suggested.length > 0 ? (
                            <>
                                <p className="mb-0">
                                    The public page shows no categories until
                                    one is here.
                                </p>
                                <div
                                    className={boardStyles.suggestion}
                                    role="status"
                                >
                                    <span>
                                        Busiest:{' '}
                                        <span
                                            className={
                                                boardStyles.suggestionNames
                                            }
                                        >
                                            {suggested
                                                .map((r) => r.display)
                                                .join(', ')}
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        className={boardStyles.primaryAction}
                                        disabled={busyIds.size > 0}
                                        onClick={() => {
                                            for (const r of suggested)
                                                setVisibility(r, true);
                                        }}
                                    >
                                        Add{' '}
                                        {suggested.length === 1 ? 'it' : 'them'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="mb-0">
                                Use “Add category” to put one there.
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <CategoryMatrix
                        game={game}
                        categories={matrixCategories}
                        groups={matrixGroups}
                        policies={policies}
                        variables={variables}
                        structure={{
                            groupOptions,
                            onGroupChange,
                            onRemove: (id) => {
                                const row = boardRows.find((r) => r.id === id);
                                if (row) setVisibility(row, false);
                            },
                            onMove: moveBy,
                            onDropRow,
                            onEdit: onEditCategory,
                            busyIds,
                            reorderPending,
                        }}
                    />

                    <div className={boardStyles.coverage}>
                        <span className={boardStyles.coverageLabel}>
                            Board coverage
                        </span>
                        <span className={boardStyles.coverageValue}>
                            {share}%
                        </span>
                        <div
                            className={boardStyles.meter}
                            role="progressbar"
                            aria-label="Share of finished runs covered by the board"
                            aria-valuenow={share}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div
                                className={boardStyles.meterFill}
                                style={{ width: `${share}%` }}
                            />
                        </div>
                        <span className={boardStyles.coverageNote}>
                            {boardRows.length} categor
                            {boardRows.length === 1 ? 'y carries' : 'ies carry'}{' '}
                            {share}% of this game's finished runs
                        </span>
                    </div>
                </>
            )}

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

            <AddCategoryDialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                game={game}
                pool={pool}
                seed={seed}
                onAdded={(ids) => {
                    for (const id of ids) onRowChange(id, { isMain: true });
                }}
            />
        </section>
    );
}
