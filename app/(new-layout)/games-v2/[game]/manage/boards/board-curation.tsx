'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
    ArrowLeftShort,
    ArrowRightShort,
    BoxArrowUpRight,
    PinAngleFill,
    Trophy,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { reorderGroupsAction } from '~src/actions/category-group/reorder-groups.action';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
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
} from '../../../../../../types/moderation.types';
import { computeCategoryVisibility } from '../../header/category-visibility';
import { computeDisplayRanks } from '../../leaderboard/display-rank';
import type { RowSlots } from '../../leaderboard/leaderboard-row';
import { LeaderboardTable } from '../../leaderboard/leaderboard-table';
import { relativeDate } from '../../leaderboard/relative-date';
import {
    timingColumnHidden,
    timingColumns,
} from '../../leaderboard/timing-columns';
import { reorderCategoriesAction } from '../game-tab/actions/reorder-categories.action';
import { computeReorderChanges } from '../game-tab/reorder-changes';
import { ModeratePanel } from '../moderation/moderate/moderate-panel';
import type { SheetBoard } from '../moderation/moderate/subject';
import { moveRunAction } from '../moderation/shared/actions/board-override.action';
import { updateVariableAction } from '../variables/actions/update-variable.action';
import { AddRunnerRow } from './add-runner-row';
import { BoardControls } from './board-controls';
import styles from './board-curation.module.scss';
import { LiveCategoryRail, LiveSubcategoryTier } from './live-category-rail';
import { rosterEntry, rosterLeaderboard } from './roster-entry';
import { RowActions, rosterTimingValue } from './row-actions';
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
            // The wizard previews the live board, so it opens on the board a
            // reader lands on: the rail's first category, else the first level.
            if (context === 'wizard') {
                const { sections, levels } = computeCategoryVisibility(
                    featured,
                    groups,
                    game.categoryDisplayMode,
                );
                const first =
                    sections.flatMap((s) => s.pills)[0] ??
                    levels.groups[0]?.boards[0];
                if (first) return first.id;
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

    // The wizard's last step is "what goes live": its rail runs the public
    // board's own visibility rules. Reorder mode keeps the flat moderator
    // switcher, which is the one that can nudge every category.
    const liveVisibility = useMemo(
        () =>
            computeCategoryVisibility(
                featured,
                groups,
                game.categoryDisplayMode,
                category?.name,
            ),
        [featured, groups, game.categoryDisplayMode, category?.name],
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
    // Which run the moderate modal is open on, by id rather than by entry:
    // a reload rebuilds the rows, and an entry captured by reference would go
    // stale under the modal.
    const [inspectRunId, setInspectRunId] = useState<number | null>(null);
    // The modal is open on the bulk selection.
    const [bulkModerateOpen, setBulkModerateOpen] = useState(false);
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

    const minMs = useMemo(() => {
        if (!category) return null;
        const policy =
            findCategoryMinPolicy(policies, category.id) ??
            findGameMinPolicy(policies);
        return minMsFromPolicy(policy, timing);
    }, [category, policies, timing]);

    // The board arrives filtered, ordered and ranked server-side (see
    // getBoardPage); this only narrows to the rows actually on the board and
    // stamps each one's rank and below-minimum flag.
    const boardRows: RankedRow[] = useMemo(() => {
        const pageOffset = boardPageIndex * BOARD_PAGE_SIZE;
        const merged = rows
            .filter((r) => isOnBoard(r, timing))
            .map((row) => ({ row, timeMs: primaryTimeOf(row, timing) }));
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
    }, [rows, timing, minMs, ascending, boardPageIndex]);

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

    // After the board reloads under the modal (the open run removed or moved
    // away), stay on the run if it is still listed, else take the next run
    // that survived, else the one before it, else close. A run that left the
    // board also leaves the selection, so bulk counts stay honest. Worked out
    // during render so the modal never renders without a run while one
    // survives.
    const runOrderSignature = visibleBoardRows
        .map(({ row }) => row.runId)
        .join('|');
    const [seenRunOrder, setSeenRunOrder] = useState<{
        signature: string;
        runIds: number[];
    }>(() => ({
        signature: runOrderSignature,
        runIds: visibleBoardRows.map(({ row }) => row.runId),
    }));
    if (seenRunOrder.signature !== runOrderSignature) {
        const next = visibleBoardRows.map(({ row }) => row.runId);
        setSeenRunOrder({ signature: runOrderSignature, runIds: next });
        const survivors = new Set(next);
        if (Array.from(selectedRunIds).some((id) => !survivors.has(id))) {
            setSelectedRunIds(
                new Set(
                    Array.from(selectedRunIds).filter((id) =>
                        survivors.has(id),
                    ),
                ),
            );
        }
        if (inspectRunId !== null && !survivors.has(inspectRunId)) {
            const previous = seenRunOrder.runIds;
            const at = previous.indexOf(inspectRunId);
            const landing =
                at === -1
                    ? null
                    : (previous.slice(at + 1).find((id) => survivors.has(id)) ??
                      previous
                          .slice(0, at)
                          .reverse()
                          .find((id) => survivors.has(id)) ??
                      null);
            setInspectRunId(landing);
        }
    }

    // An emptied selection closes its modal, so the next selection starts closed.
    if (bulkModerateOpen && selectedRunIds.size === 0) {
        setBulkModerateOpen(false);
    }

    const sheetBoard: SheetBoard | null = category
        ? {
              categoryId: category.id,
              categorySlug: category.name,
              categoryDisplay: category.display,
              subcategoryKey,
              primaryTiming: timing,
          }
        : null;
    const sheetContext = {
        gameSlug: game.name,
        gameId: game.id,
        gameDisplay: game.display,
        categories,
        variables,
        canSiteBan,
    };
    const selectedEntries = visibleBoardRows
        .filter(({ row }) => selectedRunIds.has(row.runId))
        .map(({ row, rank }) => rosterEntry(row, rank));

    /** The run a row's Moderate button opened. Roster rows are always real runs. */
    const inspectIndex =
        inspectRunId == null
            ? -1
            : visibleBoardRows.findIndex(
                  ({ row }) => row.runId === inspectRunId,
              );
    const inspectEntry =
        inspectIndex >= 0
            ? rosterEntry(
                  visibleBoardRows[inspectIndex].row,
                  visibleBoardRows[inspectIndex].rank,
              )
            : null;

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
        timeBadges: (entry) =>
            entry.runId != null && byRunId.get(entry.runId)?.belowMinimum ? (
                <span className={styles.belowMinTag}>Below minimum</span>
            ) : null,
        runnerBadges: (entry) => {
            const found = entry.runId != null ? byRunId.get(entry.runId) : null;
            if (!found) return null;
            const { row } = found;
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
                    {row.boardOverride != null && category && (
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
            if (!found) return null;
            return <RowActions row={found.row} gameSlug={game.name} />;
        },
    };

    // Console mounts wear the console's pane anatomy; the wizard embeds the
    // same board without it. The door back to the exact public board being
    // curated sits in the header's action slot — every moderator gets it,
    // not just configurers. The wizard context has no public board yet.
    const paneIntro = context === 'console' && (
        <div className={styles.paneIntro}>
            <header className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Structure</div>
                    <h2 className={consoleStyles.paneTitle}>Boards</h2>
                </div>
                {category && (
                    <div className={consoleStyles.paneActions}>
                        <Link
                            className={styles.boardLink}
                            href={buildBoardHref(game.name, {
                                categorySlug: category.name,
                                subcategoryKey,
                            })}
                        >
                            View public board
                            <BoxArrowUpRight size={12} aria-hidden />
                        </Link>
                    </div>
                )}
            </header>
            <p className={consoleStyles.paneLede}>
                The public leaderboard with moderator actions on every run.
            </p>
        </div>
    );

    if (featured.length === 0) {
        return (
            <section
                className={styles.root}
                aria-label={
                    context === 'wizard' ? 'Board preview' : 'Board curation'
                }
            >
                {paneIntro}
                <div className={styles.empty}>
                    <Trophy
                        size={28}
                        className={styles.emptyIcon}
                        aria-hidden
                    />
                    <p className={styles.emptyTitle}>
                        No categories are featured yet.
                    </p>
                    {canConfigure && (
                        <p className={styles.emptyHint}>
                            Feature at least one category to see its board here.
                        </p>
                    )}
                </div>
            </section>
        );
    }

    return (
        <section
            className={styles.root}
            aria-label={
                context === 'wizard' ? 'Board preview' : 'Board curation'
            }
        >
            {paneIntro}

            {context === 'wizard' && !reorderMode ? (
                <LiveCategoryRail
                    visibility={liveVisibility}
                    selected={category}
                    onSelect={(c) => setSelectedCategoryId(c.id)}
                />
            ) : (
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
                                                            namedSections.length -
                                                                1
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
                                            const active =
                                                c.id === category?.id;
                                            const chipButton = (
                                                <button
                                                    type="button"
                                                    aria-pressed={active}
                                                    className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                                                    onClick={() =>
                                                        setSelectedCategoryId(
                                                            c.id,
                                                        )
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
                                                    className={
                                                        styles.nudgeGroup
                                                    }
                                                >
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.nudgeBtn
                                                        }
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
                                                        className={
                                                            styles.nudgeBtn
                                                        }
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
            )}

            {context === 'wizard' && !reorderMode ? (
                <LiveSubcategoryTier
                    variables={subcatVars}
                    selectedValues={selectedValues}
                    onSelect={(name, canonical) =>
                        setSelectedValues((prev) => ({
                            ...prev,
                            [name]: canonical,
                        }))
                    }
                />
            ) : (
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
            )}

            {/* One composed toolbar directly above the table: the board's
                scan line (run count, marked-pile filter) on the left, the
                configure controls on the right. */}
            {(markedTotal > 0 ||
                showMarkedOnly ||
                (canConfigure && category)) && (
                <div className={styles.toolbar}>
                    <div className={styles.toolbarFilters}>
                        {!loading && !error && (
                            <span className={styles.boardCount}>
                                {pagerTotal}{' '}
                                {showMarkedOnly ? 'marked runs' : 'runs'}
                            </span>
                        )}
                        {(markedTotal > 0 || showMarkedOnly) && (
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
                        )}
                    </div>
                    {canConfigure && category && (
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

            {selectedRunIds.size > 0 && (
                <div className={styles.selectionBar}>
                    <span className={styles.selectionCount}>
                        {selectedRunIds.size} selected
                    </span>
                    <button
                        type="button"
                        className={styles.selectionBtn}
                        onClick={() => setBulkModerateOpen(true)}
                    >
                        Moderate {selectedEntries.length}
                    </button>
                    <button
                        type="button"
                        className={styles.selectionClear}
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
                        <div
                            className={styles.loadingRows}
                            role="status"
                            aria-label="Loading board"
                        >
                            <div className={styles.loadingRow} />
                            <div className={styles.loadingRow} />
                            <div className={styles.loadingRow} />
                            <div className={styles.loadingRow} />
                            <div className={styles.loadingRow} />
                        </div>
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
                            onModerate={(entry) =>
                                setInspectRunId(entry.runId ?? null)
                            }
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
                    {inspectEntry != null && sheetBoard && (
                        <ModeratePanel
                            subject={{
                                kind: 'run',
                                entry: inspectEntry,
                                board: sheetBoard,
                            }}
                            context={sheetContext}
                            mount="modal"
                            position={{
                                index: inspectIndex + 1,
                                total: visibleBoardRows.length,
                            }}
                            onClose={() => setInspectRunId(null)}
                            onMutated={reload}
                            onPrev={
                                inspectIndex > 0
                                    ? () =>
                                          setInspectRunId(
                                              visibleBoardRows[inspectIndex - 1]
                                                  .row.runId,
                                          )
                                    : undefined
                            }
                            onNext={
                                inspectIndex < visibleBoardRows.length - 1
                                    ? () =>
                                          setInspectRunId(
                                              visibleBoardRows[inspectIndex + 1]
                                                  .row.runId,
                                          )
                                    : undefined
                            }
                        />
                    )}
                    {bulkModerateOpen &&
                        inspectEntry == null &&
                        selectedEntries.length > 0 &&
                        sheetBoard && (
                            <ModeratePanel
                                subject={{
                                    kind: 'bulk',
                                    entries: selectedEntries,
                                    board: sheetBoard,
                                }}
                                context={sheetContext}
                                mount="modal"
                                onClose={() => setBulkModerateOpen(false)}
                                onMutated={reload}
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
        </section>
    );
}
