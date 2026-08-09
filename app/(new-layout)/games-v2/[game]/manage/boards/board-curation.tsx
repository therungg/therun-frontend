'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
    ArrowLeftShort,
    ArrowRightShort,
    PinAngleFill,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { reorderGroupsAction } from '~src/actions/category-group/reorder-groups.action';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { buildBoardHref, buildBoardQuery } from '~src/lib/board-url';
import { compareByBoardOrder } from '~src/lib/console/category-order';
import { sectionsFor } from '~src/lib/console/category-sections';
import { formatRunDate } from '~src/lib/format-run-date';
import {
    findCategoryMinPolicy,
    findGameMinPolicy,
    minMsFromPolicy,
} from '~src/lib/setup/game-minimum';
import {
    buildSubcategoryKey,
    normalizeVariableName,
} from '~src/lib/variables/keys';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type {
    BoardPolicyRow,
    LeaderboardRosterRow,
    PreviewExcludeResult,
    UserEligibleRunRow,
} from '../../../../../../types/moderation.types';
import { computeDisplayRanks } from '../../leaderboard/display-rank';
import type { RowSlots } from '../../leaderboard/leaderboard-row';
import { LeaderboardTable } from '../../leaderboard/leaderboard-table';
import { relativeDate } from '../../leaderboard/relative-date';
import {
    timingColumnHidden,
    timingColumns,
} from '../../leaderboard/timing-columns';
import { BoardDialog } from '../../shared/board-dialog';
import { reorderCategoriesAction } from '../game-tab/actions/reorder-categories.action';
import { computeReorderChanges } from '../game-tab/reorder-changes';
import { moveRunAction } from '../moderation/shared/actions/board-override.action';
import { loadUserEligibleRunsAction } from '../moderation/shared/actions/eligible-runs.action';
import {
    excludeAction,
    previewExcludeAction,
} from '../moderation/shared/actions/exclude.action';
import { markRunsAction } from '../moderation/shared/actions/marks.action';
import { restoreRunsAction } from '../moderation/shared/actions/restore.action';
import { fireUndoToast } from '../moderation/shared/undo-toast';
import { updateVariableAction } from '../variables/actions/update-variable.action';
import { AddRunnerRow } from './add-runner-row';
import { BoardControls } from './board-controls';
import styles from './board-curation.module.scss';
import { rosterLeaderboard } from './roster-entry';
import {
    type PendingRemoval,
    primaryValueOf,
    RemovedNote,
    RowActions,
    rosterTimingValue,
} from './row-actions';
import {
    defaultCanonicalOf,
    SubcategoryBands,
    subcategoryVariablesFor,
    variableUpsertBody,
} from './subcategory-bands';
import { BOARD_PAGE_SIZE, useBoardData } from './use-board-data';

export interface BoardCurationProps {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    variables: VariableRow[];
    policies: BoardPolicyRow[];
    canConfigure: boolean;
    /** Admin-only site-wide anonymize in row actions. Optional so the
     * setup-wizard mounts (which never pass it) stay admin-feature-free. */
    canSiteBan?: boolean;
    context: 'wizard' | 'console';
}

function primaryTimeOf(
    row: LeaderboardRosterRow,
    timing: 'rt' | 'gt',
): number | null {
    return timing === 'gt' ? row.gameTime : row.time;
}

/** Whether a roster row is the runner's current leaderboard entry for the
 * category's primary timing — this is what makes "the real board" real
 * rather than every eligible run in the category. */
function isOnBoard(row: LeaderboardRosterRow, timing: 'rt' | 'gt'): boolean {
    return timing === 'gt' ? row.isLeaderboardEntryGt : row.isLeaderboardEntry;
}

interface RankedRow {
    row: LeaderboardRosterRow;
    rank: number;
    timeMs: number | null;
    belowMinimum: boolean;
}

/**
 * The real board, rendered for curation: category switcher, subcategory
 * bands, and a ranked table sourced from the mod roster endpoint. This is
 * the scaffold — row actions (mark for later, remove, ban, fix time, move,
 * add runner, bulk) land in Tasks 10-12 on top of it.
 */
export function BoardCuration({
    game,
    categories,
    groups,
    variables,
    policies,
    canConfigure,
    canSiteBan = false,
    context,
}: BoardCurationProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const featured = useMemo(
        () =>
            categories
                .filter((c) => !c.archived && (c.isMain ?? false))
                .sort(compareByBoardOrder),
        [categories],
    );

    // Console context only: the pane is deep-linkable — `?category=<slug>`
    // plus one raw param per subcategory variable, the exact query shape the
    // public board itself uses (board-url.ts), so the board's "Curate" chip
    // lands on the same slice the moderator was looking at. Read once on
    // mount; the effect below keeps the URL in sync afterwards.
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
        () => {
            if (context === 'console') {
                const slug = searchParams.get('category');
                const fromUrl = slug
                    ? featured.find((c) => c.name === slug)
                    : null;
                if (fromUrl) return fromUrl.id;
            }
            return featured[0]?.id ?? null;
        },
    );
    const category =
        featured.find((c) => c.id === selectedCategoryId) ??
        featured[0] ??
        null;

    const sections = useMemo(
        () => sectionsFor(featured, groups),
        [featured, groups],
    );

    // Named groups only (the trailing ungrouped bucket, id null, has no
    // header and is never itself reorderable relative to a named group).
    const namedSections = useMemo(
        () => sections.filter((s) => s.id != null),
        [sections],
    );

    const subcatVars = useMemo(
        () => (category ? subcategoryVariablesFor(category.id, variables) : []),
        [category, variables],
    );

    const [selectedValues, setSelectedValues] = useState<
        Record<string, string>
    >(() => {
        // URL values are held to the variable's real canonical values — a
        // stale or hand-typed param falls back to the default rather than
        // producing an empty board.
        if (context !== 'console') return {};
        const values: Record<string, string> = {};
        for (const v of subcatVars) {
            const raw = searchParams.get(v.nameNormalized);
            if (!raw) continue;
            const canonicals = v.values.map((bucket) =>
                normalizeVariableName(bucket[0] ?? ''),
            );
            if (canonicals.includes(raw)) {
                values[v.nameNormalized] = raw;
            }
        }
        return values;
    });

    // ---- Reorder mode (Task 12) -----------------------------------------
    // A single toggle drives nudge (↑/↓/←/→) controls on category tabs and
    // group headers (rendered below) and on SubcategoryBands' rows/values
    // (handlers passed down as onNudgeRow/onNudgeValue) — one busy flag
    // covers all of them since they're never fired concurrently by a single
    // moderator.
    const [reorderMode, setReorderMode] = useState(false);
    const [isReordering, startReorder] = useTransition();

    const nudgeCategory = (
        items: ResolvedCategory[],
        idx: number,
        dir: -1 | 1,
    ) => {
        const targetIdx = idx + dir;
        if (targetIdx < 0 || targetIdx >= items.length) return;
        const scopeRows = items.map((c) => ({
            id: c.id,
            sortOrder: c.sortOrder,
        }));
        const { changes } = computeReorderChanges(scopeRows, idx, targetIdx);
        if (changes.length === 0) return;
        startReorder(async () => {
            const res = await reorderCategoriesAction({
                gameSlug: game.name,
                gameId: game.id,
                changes,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            router.refresh();
        });
    };

    const nudgeGroup = (idx: number, dir: -1 | 1) => {
        const targetIdx = idx + dir;
        if (targetIdx < 0 || targetIdx >= namedSections.length) return;
        const ids = namedSections.map((s) => s.id as number);
        const next = ids.slice();
        const tmp = next[idx];
        next[idx] = next[targetIdx];
        next[targetIdx] = tmp;
        startReorder(async () => {
            const res = await reorderGroupsAction({
                gameSlug: game.name,
                gameId: game.id,
                groupIds: next,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            router.refresh();
        });
    };

    const nudgeVariableRow = (
        _variable: VariableRow,
        index: number,
        dir: -1 | 1,
    ) => {
        const targetIdx = index + dir;
        if (targetIdx < 0 || targetIdx >= subcatVars.length) return;
        const a = subcatVars[index];
        const b = subcatVars[targetIdx];
        const aOrder = a.sortOrder;
        const bOrder = b.sortOrder;
        startReorder(async () => {
            const resA = await updateVariableAction({
                gameSlug: game.name,
                gameId: game.id,
                body: variableUpsertBody(a, { sortOrder: bOrder }),
            });
            if ('error' in resA) {
                toast.error(resA.error);
                return;
            }
            const resB = await updateVariableAction({
                gameSlug: game.name,
                gameId: game.id,
                body: variableUpsertBody(b, { sortOrder: aOrder }),
            });
            if ('error' in resB) {
                toast.error(resB.error);
                return;
            }
            router.refresh();
        });
    };

    const nudgeVariableValue = (
        variable: VariableRow,
        valueIdx: number,
        dir: -1 | 1,
    ) => {
        const targetIdx = valueIdx + dir;
        if (targetIdx < 0 || targetIdx >= variable.values.length) return;
        const nextValues = variable.values.slice();
        const tmp = nextValues[valueIdx];
        nextValues[valueIdx] = nextValues[targetIdx];
        nextValues[targetIdx] = tmp;
        startReorder(async () => {
            const res = await updateVariableAction({
                gameSlug: game.name,
                gameId: game.id,
                body: variableUpsertBody(variable, { values: nextValues }),
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            router.refresh();
        });
    };

    const subcategoryKey = useMemo(() => {
        if (subcatVars.length === 0) return '';
        return buildSubcategoryKey(
            subcatVars.map((v) => ({
                name: v.nameNormalized,
                value:
                    selectedValues[v.nameNormalized] ?? defaultCanonicalOf(v),
            })),
        );
    }, [subcatVars, selectedValues]);

    // Reflect the current board slice back into the URL so the pane stays
    // shareable/bookmarkable as the moderator switches boards. `replace`, not
    // `push` — switching categories shouldn't stack history entries, and the
    // pane param survives because buildBoardQuery never emits one.
    const categorySlug = category?.name ?? null;
    useEffect(() => {
        if (context !== 'console' || !categorySlug) return;
        const sp = buildBoardQuery({ categorySlug, subcategoryKey });
        sp.set('pane', 'boards');
        const next = `?${sp.toString()}`;
        if (window.location.search !== next) {
            router.replace(next, { scroll: false });
        }
    }, [context, categorySlug, subcategoryKey, router]);

    const timing: 'rt' | 'gt' = category?.primaryTiming === 'gt' ? 'gt' : 'rt';

    // Same modules the public table uses, so the two cannot drift: the
    // ranking clock leads, the other one follows and hides when the category
    // hides it or no loaded row has a value for it.
    const timingCols = timingColumns(timing, category?.gameTimeLabel ?? 'igt');
    const showMilliseconds = category?.showMilliseconds ?? true;

    // Defaults to ascending (lower time = better), same default the Display
    // popover uses (board-controls.tsx) and the same fallback categoryMgmt
    // applies server-side — an inverted (`sortAscending: false`, "higher
    // time = better") category must rank its longest time #1, or curation
    // shows the board backwards from what the public leaderboard renders.
    const ascending = category?.sortAscending ?? true;

    const [showMarkedOnly, setShowMarkedOnly] = useState(false);
    const [boardPageIndex, setBoardPageIndex] = useState(0);

    const { rows, total, markedTotal, loading, error, reload } = useBoardData(
        game.name,
        category?.id ?? null,
        subcategoryKey,
        {
            timing,
            sortDesc: !ascending,
            markedOnly: showMarkedOnly,
            page: boardPageIndex,
        },
    );

    const pagerTotal = showMarkedOnly ? markedTotal : total;
    const pageCount = Math.max(1, Math.ceil(pagerTotal / BOARD_PAGE_SIZE));

    // A board switch resets paging; a shrinking board (removals, marks
    // clearing out) can also strand the current page past the end.
    useEffect(() => {
        setBoardPageIndex(0);
    }, [category?.id, subcategoryKey]);
    useEffect(() => {
        if (!loading && boardPageIndex >= pageCount) {
            setBoardPageIndex(pageCount - 1);
        }
    }, [loading, boardPageIndex, pageCount]);

    // Rows a Remove has already excluded server-side, pinned in place from a
    // frozen snapshot rather than `rows` above. `rows` is shared board-wide —
    // a sibling row's Later/Ban/Fix-time also reloads it, which would
    // otherwise drop this run from `boardRows` (and unmount its slip) before
    // the user has resolved it. Cleared on category/subcategory change; each
    // entry's own lifecycle (Keep it / Remove too / Undo) also clears it.
    const [pendingRemovals, setPendingRemovals] = useState<
        Map<number, PendingRemoval>
    >(new Map());

    // Runs currently clearing a board-override via the "moved here" tag's
    // (×) — tracked separately from `RowActions`' own busy state since
    // clearing a move isn't part of that action cluster.
    const [clearingMoveRunIds, setClearingMoveRunIds] = useState<Set<number>>(
        new Set(),
    );

    // Multi-select for bulk Accept/Ban.
    const [selectedRunIds, setSelectedRunIds] = useState<Set<number>>(
        new Set(),
    );

    useEffect(() => {
        setPendingRemovals(new Map());
        setSelectedRunIds(new Set());
    }, [category?.id, subcategoryKey, boardPageIndex, showMarkedOnly]);

    const toggleSelected = (runId: number) => {
        setSelectedRunIds((prev) => {
            const next = new Set(prev);
            if (next.has(runId)) {
                next.delete(runId);
            } else {
                next.add(runId);
            }
            return next;
        });
    };

    const clearSelection = () => setSelectedRunIds(new Set());

    // `currentPlacement` is the board being viewed (category.id/subcategoryKey)
    // — guaranteed to be where the row is showing right now, since it's only
    // ever wired up from inside the `{category && (...)}` block below. The
    // run's *original* placement (what clearing actually restores it to)
    // isn't exposed by `boardOverride` or anywhere else client-side, so that
    // leaderboard's cache tag can't be targeted here — it catches up on its
    // own TTL instead.
    const handleClearMove = (
        row: LeaderboardRosterRow,
        currentPlacement: { categoryId: number; subcategoryKey: string },
    ) => {
        setClearingMoveRunIds((prev) => new Set(prev).add(row.runId));
        (async () => {
            const res = await moveRunAction(game.name, row.runId, null, [
                currentPlacement,
            ]);
            setClearingMoveRunIds((prev) => {
                const next = new Set(prev);
                next.delete(row.runId);
                return next;
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            reload();
        })();
    };

    const dropPending = (runId: number) => {
        setPendingRemovals((prev) => {
            if (!prev.has(runId)) return prev;
            const next = new Map(prev);
            next.delete(runId);
            return next;
        });
    };

    // The removal itself (reason category, notify toggle, preview, undo
    // toast) happens in `RowActions`' shared Remove dialog — this only owns
    // what happens to the row afterwards: pin the frozen snapshot and look
    // up the next-run slip.
    const handleRemoved = (
        row: LeaderboardRosterRow,
        rowTimeMs: number | null,
    ) => {
        (async () => {
            // A removed row can't be part of a bulk Accept/Ban selection
            // anymore — without this, a stale runId rides along in
            // `selectedRunIds` and a subsequent bulk action fires against a
            // run that's no longer on the board.
            setSelectedRunIds((prev) => {
                if (!prev.has(row.runId)) return prev;
                const next = new Set(prev);
                next.delete(row.runId);
                return next;
            });

            // Pin the overlay snapshot in place regardless of what future
            // reloads (this row's own, or a sibling's) do to `rows`.
            setPendingRemovals((prev) => {
                const next = new Map(prev);
                next.set(row.runId, {
                    row,
                    timeMs: rowTimeMs,
                    nextRun: null,
                    nextRunLoading: row.userId != null,
                });
                return next;
            });

            if (row.userId == null) {
                // Guests have no userId to query eligible runs for — no slip
                // to show, so resync now.
                dropPending(row.runId);
                reload();
                return;
            }

            const userId = row.userId;
            const eligible = await loadUserEligibleRunsAction(
                game.name,
                userId,
            );
            if (!('ok' in eligible)) {
                // Couldn't check for a replacement — nothing left to keep
                // this row pinned for.
                dropPending(row.runId);
                reload();
                return;
            }
            const candidates: UserEligibleRunRow[] = eligible.rows
                .filter(
                    (r) =>
                        r.categoryId === category?.id &&
                        r.subcategoryKey === subcategoryKey &&
                        r.runId !== row.runId,
                )
                .sort((a, b) => {
                    const at = primaryValueOf(a, timing);
                    const bt = primaryValueOf(b, timing);
                    if (at == null && bt == null) return 0;
                    if (at == null) return 1;
                    if (bt == null) return -1;
                    return at - bt;
                });
            const best = candidates[0] ?? null;
            if (best == null) {
                // No same-board replacement to offer — nothing left to show,
                // safe to resync now.
                dropPending(row.runId);
                reload();
                return;
            }
            // A category/subcategory switch (or Undo) may have already
            // dropped this entry while the query above was in flight.
            setPendingRemovals((prev) => {
                const existing = prev.get(row.runId);
                if (!existing) return prev;
                const next = new Map(prev);
                next.set(row.runId, {
                    ...existing,
                    nextRun: best,
                    nextRunLoading: false,
                });
                return next;
            });
        })();
    };

    const handleKeepIt = (runId: number) => {
        dropPending(runId);
        reload();
    };

    const handleRemoveToo = (runId: number, candidate: UserEligibleRunRow) => {
        (async () => {
            const res = await excludeAction(game.name, {
                runIds: [candidate.runId],
                // Canned (min-10) — the follow-up removal of the same
                // runner's replacement run from the next-run slip.
                reason: "Removed together with the runner's removed run",
            });
            if ('error' in res) {
                // Nothing changed — the original run's overlay entry is
                // still intact, so there's nothing to resync yet. Dropping
                // it here (as a prior version did, unconditionally and
                // before this call even started) meant a failed "Remove
                // too" silently discarded the Keep it/Remove too slip with
                // no way back to it, and forced a same-tick reload purely
                // to paper over that self-inflicted gap.
                toast.error(res.error);
                return;
            }
            // Drop the original's overlay entry and reload together, once
            // the outcome is actually known — one settle, one reload.
            dropPending(runId);
            fireUndoToast(
                'Removed.',
                () =>
                    restoreRunsAction(
                        game.name,
                        [candidate.runId],
                        'Undo of remove',
                    ),
                reload,
            );
            reload();
        })();
    };

    const minMs = useMemo(() => {
        if (!category) return null;
        const policy =
            findCategoryMinPolicy(policies, category.id) ??
            findGameMinPolicy(policies);
        return minMsFromPolicy(policy, timing);
    }, [category, policies, timing]);

    // The board arrives filtered, ordered, and ranked server-side (see
    // getBoardPage); the merge here only re-inserts pending-removal overlay
    // snapshots (rows a Remove already excluded server-side, pinned visible
    // until their slip is resolved) at their old positions.
    const boardRows: RankedRow[] = useMemo(() => {
        const pageOffset = boardPageIndex * BOARD_PAGE_SIZE;
        const live = rows
            .filter(
                (r) => isOnBoard(r, timing) && !pendingRemovals.has(r.runId),
            )
            .map((row) => ({ row, timeMs: primaryTimeOf(row, timing) }));
        const overlay = Array.from(pendingRemovals.values()).map((p) => ({
            row: p.row,
            timeMs: p.timeMs,
        }));
        const merged = [...live, ...overlay];
        merged.sort((a, b) => {
            if (a.timeMs == null && b.timeMs == null) return 0;
            if (a.timeMs == null) return 1;
            if (b.timeMs == null) return -1;
            return ascending ? a.timeMs - b.timeMs : b.timeMs - a.timeMs;
        });
        return merged.map((entry, i) => ({
            ...entry,
            rank: entry.row.boardRank ?? pageOffset + i + 1,
            // The minimum-time policy is an absolute suspicious-run floor
            // (guards against implausibly fast completions), not a ranking
            // concept — it stays "below this ms is suspect" regardless of
            // which direction the category ranks in, so this check doesn't
            // flip with `ascending`.
            belowMinimum:
                minMs != null && entry.timeMs != null && entry.timeMs < minMs,
        }));
    }, [rows, timing, minMs, pendingRemovals, ascending, boardPageIndex]);

    const visibleBoardRows = boardRows;

    /**
     * The non-ranked clock earns its column only if the category shows it AND
     * some loaded row actually has one — the same two-part rule
     * `LeaderboardTable` applies, so a board that renders one time column
     * publicly does not sprout a second one full of dashes in here.
     */
    const showSecondaryTiming =
        !timingColumnHidden(timingCols.secondary.key, {
            hideRealTime: category?.hideRealTime ?? false,
            hideGameTime: category?.hideGameTime ?? false,
        }) &&
        visibleBoardRows.some(
            ({ row }) =>
                rosterTimingValue(row, timingCols.secondary.key) != null,
        );

    /**
     * The board table's own data shape. Curation reads the mod roster
     * endpoint, the public page reads the board endpoint; `rosterEntry` is
     * the only place that knows they describe the same runs.
     */
    const curationLeaderboard = rosterLeaderboard(
        visibleBoardRows.map(({ row, rank }) => ({ row, rank })),
        category,
        boardPageIndex + 1,
        BOARD_PAGE_SIZE,
        showMarkedOnly ? markedTotal : total,
    );

    // The table keys selection by `r:<runId>` so runs and manual times can
    // share one Set; curation tracks bare run ids. Translate at the boundary
    // rather than changing either side's vocabulary.
    const selectedKeys = new Set(
        Array.from(selectedRunIds).map((id) => `r:${id}`),
    );
    const handleToggleSelect = (key: string) => {
        const id = Number(key.slice(2));
        if (Number.isFinite(id)) toggleSelected(id);
    };
    const handleToggleAllVisible = () => {
        const ids = visibleBoardRows.map(({ row }) => row.runId);
        const allSelected = ids.every((id) => selectedRunIds.has(id));
        for (const id of ids) {
            if (allSelected === selectedRunIds.has(id)) toggleSelected(id);
        }
    };

    const byRunId = new Map(
        visibleBoardRows.map(({ row, belowMinimum, timeMs }) => [
            row.runId,
            { row, belowMinimum, timeMs },
        ]),
    );

    /**
     * Everything curation shows that the public board does not. Rendered by
     * `LeaderboardRow` through its slots, so curation extends the real row
     * instead of maintaining a second one.
     */
    const curationSlots: RowSlots = {
        rowClassName: (entry) =>
            entry.runId != null && pendingRemovals.has(entry.runId)
                ? styles.rowRemoved
                : '',
        timeBadges: (entry) =>
            entry.runId != null && byRunId.get(entry.runId)?.belowMinimum ? (
                <span className={styles.belowMinTag}>Below minimum</span>
            ) : null,
        runnerBadges: (entry) => {
            const found = entry.runId != null ? byRunId.get(entry.runId) : null;
            if (!found) return null;
            const { row } = found;
            const pending = pendingRemovals.has(row.runId);
            return (
                <>
                    {row.markedForLater && (
                        <PinAngleFill
                            size={12}
                            className={styles.pin}
                            aria-label="Marked for later"
                        />
                    )}
                    {row.userId == null && (
                        <span className={styles.guestTag}>guest</span>
                    )}
                    {!pending && row.boardOverride != null && category && (
                        <span className={styles.movedTag}>
                            moved here
                            <button
                                type="button"
                                className={styles.movedClear}
                                aria-label={`Clear move for ${row.runnerName}`}
                                onClick={() =>
                                    handleClearMove(row, {
                                        categoryId: category.id,
                                        subcategoryKey,
                                    })
                                }
                                disabled={clearingMoveRunIds.has(row.runId)}
                            >
                                &times;
                            </button>
                        </span>
                    )}
                </>
            );
        },
        actions: (entry) => {
            const found = entry.runId != null ? byRunId.get(entry.runId) : null;
            if (!found || !category) return null;
            const { row, timeMs, belowMinimum } = found;
            const pending = pendingRemovals.get(row.runId);
            if (pending) {
                return (
                    <RemovedNote
                        pending={pending}
                        timing={timing}
                        showMilliseconds={showMilliseconds}
                        onKeepIt={() => handleKeepIt(row.runId)}
                        onRemoveToo={() =>
                            pending.nextRun &&
                            handleRemoveToo(row.runId, pending.nextRun)
                        }
                    />
                );
            }
            return (
                <RowActions
                    row={row}
                    category={category}
                    categories={featured}
                    variables={variables}
                    subcategoryKey={subcategoryKey}
                    gameSlug={game.name}
                    timeMs={timeMs}
                    belowMinimum={belowMinimum}
                    onRemoved={() => handleRemoved(row, timeMs)}
                    onRemoveUndone={() => {
                        dropPending(row.runId);
                        reload();
                    }}
                    onMutated={reload}
                    canSiteBan={canSiteBan}
                />
            );
        },
    };

    // ---- Bulk accept ----------------------------------------------------
    const [isBulkAccepting, startBulkAccept] = useTransition();

    const handleBulkAccept = () => {
        const ids = Array.from(selectedRunIds);
        if (ids.length === 0) return;
        startBulkAccept(async () => {
            const res = await markRunsAction(game.name, ids, false);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            clearSelection();
            reload();
        });
    };

    // ---- Bulk ban ---------------------------------------------------------
    // Aggregates one `previewExcludeAction` per unique selected user (run
    // by run — the endpoint is user-scoped, not batch) into a single sheet,
    // then applies them sequentially against one shared reason. Guests have
    // no persistent identity to ban and are skipped, noted in the sheet.
    const [bulkBanOpen, setBulkBanOpen] = useState(false);
    const [bulkBanUserIds, setBulkBanUserIds] = useState<number[]>([]);
    const [bulkBanGuestCount, setBulkBanGuestCount] = useState(0);
    const [bulkBanPreviews, setBulkBanPreviews] = useState<Map<
        number,
        PreviewExcludeResult
    > | null>(null);
    const [bulkBanPreviewError, setBulkBanPreviewError] = useState<
        string | null
    >(null);
    const [bulkBanReason, setBulkBanReason] = useState('');
    const [isBulkBanPreviewing, startBulkBanPreview] = useTransition();
    const [isBulkBanning, startBulkBanning] = useTransition();

    const openBulkBan = () => {
        const selectedRows = boardRows
            .filter((r) => selectedRunIds.has(r.row.runId))
            .map((r) => r.row);
        const userIds = Array.from(
            new Set(
                selectedRows
                    .filter((r) => r.userId != null)
                    .map((r) => r.userId as number),
            ),
        );
        const guestCount = selectedRows.filter((r) => r.userId == null).length;

        setBulkBanUserIds(userIds);
        setBulkBanGuestCount(guestCount);
        setBulkBanReason('');
        setBulkBanPreviews(null);
        setBulkBanPreviewError(null);
        setBulkBanOpen(true);

        if (userIds.length === 0) return;
        startBulkBanPreview(async () => {
            const results = new Map<number, PreviewExcludeResult>();
            for (const userId of userIds) {
                const res = await previewExcludeAction(game.name, {
                    rule: { type: 'user', targetId: userId },
                });
                if ('error' in res) {
                    setBulkBanPreviewError(res.error);
                    return;
                }
                results.set(userId, res.preview);
            }
            setBulkBanPreviews(results);
        });
    };

    const closeBulkBan = () => {
        if (isBulkBanning) return;
        setBulkBanOpen(false);
    };

    const confirmBulkBan = () => {
        if (bulkBanUserIds.length === 0 || bulkBanReason.trim().length === 0) {
            return;
        }
        const reason = bulkBanReason.trim();
        startBulkBanning(async () => {
            for (const userId of bulkBanUserIds) {
                const res = await excludeAction(game.name, {
                    rule: { type: 'user', targetId: userId },
                    reason,
                });
                if ('error' in res) {
                    toast.error(res.error);
                    return;
                }
            }
            toast.success(
                `${bulkBanUserIds.length} runner${bulkBanUserIds.length === 1 ? '' : 's'} banned.`,
            );
            setBulkBanOpen(false);
            clearSelection();
            reload();
        });
    };

    const bulkBanCombinedCount = bulkBanPreviews
        ? Array.from(bulkBanPreviews.values()).reduce(
              (sum, p) => sum + p.affectedRunCount,
              0,
          )
        : 0;

    if (featured.length === 0) {
        return (
            <div className={styles.empty}>
                <p className={styles.emptyTitle}>
                    No categories are featured yet.
                </p>
                {canConfigure && (
                    <p className={styles.emptyHint}>
                        Feature at least one category to see its board here.
                    </p>
                )}
            </div>
        );
    }

    return (
        <section
            className={styles.root}
            aria-label={
                context === 'wizard' ? 'Board preview' : 'Board curation'
            }
        >
            {(canConfigure || context === 'console') && category && (
                <div className={styles.paneTopRow}>
                    {/* The door back to the exact public board being curated —
                        every moderator gets it, not just configurers. The
                        wizard context has no public board to point at yet. */}
                    {context === 'console' ? (
                        <Link
                            className={styles.boardLink}
                            href={buildBoardHref(game.name, {
                                categorySlug: category.name,
                                subcategoryKey,
                            })}
                        >
                            View public board ↗
                        </Link>
                    ) : (
                        <span />
                    )}
                    {canConfigure && (
                        <BoardControls
                            gameSlug={game.name}
                            gameId={game.id}
                            category={category}
                            timing={timing}
                            policies={policies}
                            subcatVars={subcatVars}
                            selectedValues={selectedValues}
                            reorderMode={reorderMode}
                            onToggleReorderMode={() =>
                                setReorderMode((v) => !v)
                            }
                            reload={reload}
                        />
                    )}
                </div>
            )}

            <div className={styles.categorySwitch}>
                {sections.map((section, idx) => {
                    const namedIdx =
                        section.id != null
                            ? namedSections.findIndex(
                                  (s) => s.id === section.id,
                              )
                            : -1;
                    return (
                        <div
                            key={section.id ?? `ungrouped-${idx}`}
                            className={styles.block}
                            role={section.name ? 'group' : undefined}
                            aria-labelledby={
                                section.name
                                    ? `board-curation-group-${section.id ?? idx}`
                                    : undefined
                            }
                        >
                            {section.name && (
                                <span
                                    id={`board-curation-group-${section.id ?? idx}`}
                                    className={styles.endcap}
                                >
                                    {section.name}
                                    {reorderMode && namedIdx !== -1 && (
                                        <span className={styles.nudgeGroup}>
                                            <button
                                                type="button"
                                                className={styles.nudgeBtn}
                                                aria-label={`Move ${section.name} group earlier`}
                                                onClick={() =>
                                                    nudgeGroup(namedIdx, -1)
                                                }
                                                disabled={
                                                    isReordering ||
                                                    namedIdx === 0
                                                }
                                            >
                                                <ArrowLeftShort
                                                    size={14}
                                                    aria-hidden
                                                />
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.nudgeBtn}
                                                aria-label={`Move ${section.name} group later`}
                                                onClick={() =>
                                                    nudgeGroup(namedIdx, 1)
                                                }
                                                disabled={
                                                    isReordering ||
                                                    namedIdx ===
                                                        namedSections.length - 1
                                                }
                                            >
                                                <ArrowRightShort
                                                    size={14}
                                                    aria-hidden
                                                />
                                            </button>
                                        </span>
                                    )}
                                </span>
                            )}
                            <div
                                className={`${styles.well} ${section.name ? '' : styles.wellSolo}`}
                            >
                                <div className={styles.chips}>
                                    {section.items.map((c, itemIdx) => {
                                        const active = c.id === category?.id;
                                        const chipButton = (
                                            <button
                                                type="button"
                                                aria-pressed={active}
                                                className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                                                onClick={() =>
                                                    setSelectedCategoryId(c.id)
                                                }
                                            >
                                                {c.display}
                                            </button>
                                        );
                                        if (!reorderMode) {
                                            return (
                                                <span key={c.id}>
                                                    {chipButton}
                                                </span>
                                            );
                                        }
                                        return (
                                            <span
                                                key={c.id}
                                                className={styles.nudgeGroup}
                                            >
                                                <button
                                                    type="button"
                                                    className={styles.nudgeBtn}
                                                    aria-label={`Move ${c.display} earlier`}
                                                    onClick={() =>
                                                        nudgeCategory(
                                                            section.items,
                                                            itemIdx,
                                                            -1,
                                                        )
                                                    }
                                                    disabled={
                                                        isReordering ||
                                                        itemIdx === 0
                                                    }
                                                >
                                                    <ArrowLeftShort
                                                        size={14}
                                                        aria-hidden
                                                    />
                                                </button>
                                                {chipButton}
                                                <button
                                                    type="button"
                                                    className={styles.nudgeBtn}
                                                    aria-label={`Move ${c.display} later`}
                                                    onClick={() =>
                                                        nudgeCategory(
                                                            section.items,
                                                            itemIdx,
                                                            1,
                                                        )
                                                    }
                                                    disabled={
                                                        isReordering ||
                                                        itemIdx ===
                                                            section.items
                                                                .length -
                                                                1
                                                    }
                                                >
                                                    <ArrowRightShort
                                                        size={14}
                                                        aria-hidden
                                                    />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <SubcategoryBands
                variables={subcatVars}
                selectedValues={selectedValues}
                onSelect={(name, canonical) =>
                    setSelectedValues((prev) => ({
                        ...prev,
                        [name]: canonical,
                    }))
                }
                reorderMode={reorderMode}
                onNudgeRow={nudgeVariableRow}
                onNudgeValue={nudgeVariableValue}
                reorderBusy={isReordering}
            />

            {(markedTotal > 0 || showMarkedOnly) && (
                <div className={styles.markedBar}>
                    <button
                        type="button"
                        aria-pressed={showMarkedOnly}
                        className={`${styles.toolbarBtn} ${showMarkedOnly ? styles.toolbarBtnActive : ''}`}
                        onClick={() => {
                            setShowMarkedOnly((v) => !v);
                            setBoardPageIndex(0);
                        }}
                    >
                        <PinAngleFill size={11} aria-hidden />
                        {markedTotal} marked
                    </button>
                </div>
            )}

            {selectedRunIds.size > 0 && (
                <div className={styles.selectionBar}>
                    <span>{selectedRunIds.size} selected</span>
                    <span aria-hidden="true">&middot;</span>
                    <button
                        type="button"
                        className={styles.selectionAction}
                        onClick={handleBulkAccept}
                        disabled={isBulkAccepting}
                    >
                        Accept
                    </button>
                    <span aria-hidden="true">&middot;</span>
                    <button
                        type="button"
                        className={styles.selectionAction}
                        onClick={openBulkBan}
                    >
                        Ban…
                    </button>
                    <span aria-hidden="true">&middot;</span>
                    <button
                        type="button"
                        className={styles.selectionAction}
                        onClick={clearSelection}
                    >
                        Clear
                    </button>
                </div>
            )}

            {category && (
                <div className={styles.wrapper}>
                    {error && <div className={styles.errorNote}>{error}</div>}
                    {!error && loading && rows.length === 0 && (
                        <p className={styles.loadingNote}>Loading board…</p>
                    )}
                    {!error && (!loading || rows.length > 0) && (
                        <LeaderboardTable
                            leaderboard={curationLeaderboard}
                            sessionUsername={null}
                            canManage
                            gameSlug={game.name}
                            variableKeys={[]}
                            valueColumns={[]}
                            primaryTiming={timing}
                            gameTimeLabel={category?.gameTimeLabel ?? 'igt'}
                            filtersActive={showMarkedOnly}
                            showMilliseconds={showMilliseconds}
                            categorySlug={category?.name ?? ''}
                            subcategoryKey={subcategoryKey}
                            subcategoryDefKeys={[]}
                            rtaFallback={category?.rtaFallback ?? false}
                            selectedKeys={selectedKeys}
                            onToggleSelect={handleToggleSelect}
                            onToggleAllVisible={handleToggleAllVisible}
                            onBoardRefresh={reload}
                            slots={curationSlots}
                            tbodyFooter={
                                category ? (
                                    <AddRunnerRow
                                        category={category}
                                        subcategoryKey={subcategoryKey}
                                        gameSlug={game.name}
                                        knownRunners={rows}
                                        showSecondary={showSecondaryTiming}
                                        onMutated={reload}
                                    />
                                ) : null
                            }
                        />
                    )}
                    {!error && pageCount > 1 && (
                        <nav className={styles.pager} aria-label="Board pages">
                            <button
                                type="button"
                                className={styles.toolbarBtn}
                                disabled={boardPageIndex === 0 || loading}
                                onClick={() =>
                                    setBoardPageIndex((i) => Math.max(0, i - 1))
                                }
                            >
                                Previous
                            </button>
                            <span className={styles.pagerLabel}>
                                Page {boardPageIndex + 1} of {pageCount}
                                {' · '}
                                {pagerTotal}{' '}
                                {showMarkedOnly ? 'marked runs' : 'runs'}
                            </span>
                            <button
                                type="button"
                                className={styles.toolbarBtn}
                                disabled={
                                    boardPageIndex >= pageCount - 1 || loading
                                }
                                onClick={() =>
                                    setBoardPageIndex((i) =>
                                        Math.min(pageCount - 1, i + 1),
                                    )
                                }
                            >
                                Next
                            </button>
                        </nav>
                    )}
                </div>
            )}

            {bulkBanOpen && (
                <BoardDialog
                    open
                    onClose={closeBulkBan}
                    labelledBy="bulk-ban-sheet-title"
                    size="sm"
                    closeOnBackdropClick={!isBulkBanning}
                >
                    <div className={styles.dialogHeader}>
                        <h5
                            id="bulk-ban-sheet-title"
                            className={styles.dialogTitle}
                        >
                            Ban {bulkBanUserIds.length} runner
                            {bulkBanUserIds.length === 1 ? '' : 's'}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={closeBulkBan}
                            disabled={isBulkBanning}
                        />
                    </div>
                    <div className={styles.dialogBody}>
                        {bulkBanGuestCount > 0 && (
                            <p className={styles.moveNote}>
                                {bulkBanGuestCount} guest
                                {bulkBanGuestCount === 1 ? '' : 's'} selected —
                                guests can’t be banned and will be skipped.
                            </p>
                        )}
                        {bulkBanUserIds.length === 0 ? (
                            <p className={styles.moveNote}>
                                No registered runners selected — nothing to ban.
                            </p>
                        ) : (
                            <>
                                {isBulkBanPreviewing && (
                                    <p className={styles.slipLoading}>
                                        Loading preview…
                                    </p>
                                )}
                                {bulkBanPreviewError && (
                                    <div
                                        className={styles.errorAlert}
                                        role="alert"
                                    >
                                        {bulkBanPreviewError}
                                    </div>
                                )}
                                {bulkBanPreviews && (
                                    <p>
                                        <strong>{bulkBanCombinedCount}</strong>{' '}
                                        run
                                        {bulkBanCombinedCount === 1 ? '' : 's'}{' '}
                                        affected across {bulkBanUserIds.length}{' '}
                                        runner
                                        {bulkBanUserIds.length === 1 ? '' : 's'}
                                        .
                                    </p>
                                )}
                                <label
                                    htmlFor="bulk-ban-reason"
                                    className={styles.fieldLabel}
                                >
                                    Reason — required
                                </label>
                                <textarea
                                    id="bulk-ban-reason"
                                    className={styles.dialogTextarea}
                                    rows={3}
                                    value={bulkBanReason}
                                    onChange={(e) =>
                                        setBulkBanReason(e.target.value)
                                    }
                                    disabled={isBulkBanning}
                                />
                            </>
                        )}
                    </div>
                    <div className={styles.dialogFooter}>
                        <button
                            type="button"
                            className={styles.slipAction}
                            onClick={closeBulkBan}
                            disabled={isBulkBanning}
                        >
                            Cancel
                        </button>
                        {bulkBanUserIds.length > 0 && (
                            <button
                                type="button"
                                className={styles.confirmBtn}
                                onClick={confirmBulkBan}
                                disabled={
                                    isBulkBanning ||
                                    bulkBanReason.trim().length === 0 ||
                                    !!bulkBanPreviewError
                                }
                            >
                                {isBulkBanning ? 'Banning…' : 'Confirm ban'}
                            </button>
                        )}
                    </div>
                </BoardDialog>
            )}
        </section>
    );
}
