import { type ReactNode, useEffect, useRef } from 'react';
import { Funnel, Trophy } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import type {
    LeaderboardEntry,
    LeaderboardResponse,
} from '../../../../../types/leaderboards.types';
import { ClearFiltersButton } from '../filters/clear-filters-button';
import type { ModVerb } from '../manage/moderation/shared/action-model';
import { isSameRunner } from '../shared/is-same-runner';
import { SubmitLink } from '../submit-dialog/submit-link';
import { computeDisplayRanks } from './display-rank';
import styles from './leaderboard.module.scss';
import { LeaderboardRow, type RowSlots } from './leaderboard-row';
import { computeRunStandings } from './run-standing';
import { type BoardSelectionKey, entrySelectionKey } from './selection';
import {
    type TimingKey,
    timingColumnHidden,
    timingColumns,
    timingValue,
} from './timing-columns';

interface Props {
    leaderboard: LeaderboardResponse;
    sessionUsername: string | null;
    canManage: boolean;
    gameSlug: string;
    variableKeys: string[];
    /** Variables opted into a board column; `display` maps stored (normalized)
     * values to their bucket's canonical label, `altKey` is the display name
     * normalized (rawVariables may use either key). */
    valueColumns: {
        key: string;
        altKey: string;
        label: string;
        display: Record<string, string>;
    }[];
    primaryTiming: TimingKey;
    /** What the board calls its game-time clock. Display only. */
    gameTimeLabel?: 'igt' | 'lrt';
    /** True when any subcategory / variable / verified filter narrows the board. */
    filtersActive: boolean;
    /** category.showMilliseconds ?? true — precision the board is configured for. */
    showMilliseconds: boolean;
    /** Active category slug — carried into the empty-state submit link and each row's "Correct this time" link. */
    categorySlug: string;
    /** Active subcategory key — carried into the empty-state submit link. */
    subcategoryKey: string;
    /** Subcategory-role variable names, for building a row's own subcategory key from `entry.variables`. */
    subcategoryDefKeys: string[];
    /** category.rtaFallback — a GT-board entry with no game time is ranked by
     * its real time and gets an RTA marker in the ranked column. */
    rtaFallback?: boolean;
    /**
     * Board order. `entry.rank` always means "rank by time" — sorting by
     * date only changes which rows are on screen and in what order, never
     * what the `#` column says, so a date-sorted board legitimately reads
     * #1, #47, #3. Omit both (along with `onSort`) to leave the Date header
     * as plain inert text — board-curation.tsx renders this same table with
     * no sort control of its own.
     */
    sort?: 'time' | 'date';
    dir?: 'asc' | 'desc';
    /** Present only when the host wants a sort control on the Date header;
     * fires on click, cycling newest-first -> oldest-first -> default time
     * order. The host owns the actual sort state. */
    onSort?: () => void;
    /** Disables the Date header's sort button while a sort fetch is in flight. */
    sortPending?: boolean;
    /** Bulk selection — checkbox column only renders when `canManage`.
     * Keys are `r:<runId>` / `m:<manualTimeId>` (see selection.ts). */
    selectedKeys?: Set<BoardSelectionKey>;
    onToggleSelect?: (key: BoardSelectionKey, shiftKey: boolean) => void;
    /** Header checkbox — toggles every currently-rendered selectable row. */
    onToggleAllVisible?: () => void;
    /** Fires a moderation verb on a row's entry (quick-remove, etc.); the
     * host renders the confirmation dialog for it. */
    onQuickModerate?: (entry: LeaderboardEntry, verb: ModVerb) => void;
    /** Board page refetch for row-level mutations (quick Verify + undo). */
    onBoardRefresh?: () => void;
    /** Curation-only per-row additions, forwarded to every row. */
    slots?: RowSlots;
    /** Appended inside `<tbody>` after the rows — curation's Add-runner ghost
     *  row, which is not an entry and so cannot come through `entries`. */
    tbodyFooter?: ReactNode;
}

export function LeaderboardTable({
    leaderboard,
    sessionUsername,
    canManage,
    gameSlug,
    variableKeys,
    valueColumns,
    primaryTiming,
    gameTimeLabel = 'igt',
    filtersActive,
    showMilliseconds,
    categorySlug,
    subcategoryKey,
    subcategoryDefKeys,
    rtaFallback = false,
    sort,
    dir,
    onSort,
    sortPending = false,
    selectedKeys,
    onToggleSelect,
    onToggleAllVisible,
    onQuickModerate,
    onBoardRefresh,
    slots,
    tbodyFooter,
}: Props) {
    const selectableKeys = leaderboard.entries
        .map(entrySelectionKey)
        .filter((key): key is BoardSelectionKey => key != null);
    const selectedCount = selectedKeys
        ? selectableKeys.filter((key) => selectedKeys.has(key)).length
        : 0;
    const allSelected =
        selectableKeys.length > 0 && selectedCount === selectableKeys.length;
    const someSelected = selectedCount > 0 && !allSelected;
    const selectAllRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = someSelected;
        }
    }, [someSelected]);

    if (leaderboard.entries.length === 0) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.empty}>
                    {filtersActive ? (
                        <>
                            <Funnel
                                size={28}
                                className={styles.emptyIcon}
                                aria-hidden
                            />
                            <p className={styles.emptyTitle}>
                                No runs match these filters.
                            </p>
                            <ClearFiltersButton variableKeys={variableKeys} />
                        </>
                    ) : (
                        <>
                            <Trophy
                                size={28}
                                className={styles.emptyIcon}
                                aria-hidden
                            />
                            <p className={styles.emptyTitle}>
                                No runs on this board yet.
                            </p>
                            <SubmitLink
                                gameSlug={gameSlug}
                                categorySlug={categorySlug}
                                subcategoryKey={subcategoryKey}
                                className={styles.emptyAction}
                            >
                                Submit the first run
                            </SubmitLink>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // A value column where no loaded row has a runner-set value would render a
    // wall of dashes — hide it entirely, same policy as the secondary time
    // column below. Recomputed per page, so a page with data re-shows it.
    const visibleValueColumns = valueColumns.filter((col) =>
        leaderboard.entries.some(
            (e) =>
                e.variables?.[col.key] != null &&
                e.rawVariables != null &&
                (e.rawVariables[col.key] !== undefined ||
                    e.rawVariables[col.altKey] !== undefined),
        ),
    );

    const { hideRealTime, hideGameTime } = leaderboard;
    const { primary, secondary } = timingColumns(primaryTiming, gameTimeLabel);
    // Every entry in the loaded window has no secondary time at all — hide
    // the column entirely rather than render a wall of dashes. A later page
    // introducing data re-shows it (recomputed each render, not sticky).
    const secondaryAllNull = leaderboard.entries.every(
        (e) => timingValue(e, secondary.key) == null,
    );
    const hidden = (key: TimingKey) =>
        timingColumnHidden(key, { hideRealTime, hideGameTime }) ||
        (key === secondary.key && secondaryAllNull);
    // computeDisplayRanks marks a row tied only with its NEIGHBOR in the
    // loaded window — a sound read when the window is time-ordered, since a
    // tie group is then contiguous. Under a date sort it isn't: two rows
    // that share a time can land anywhere apart, so a genuine tie's partner
    // is usually not adjacent, and the "=" that does survive shows up as an
    // orphan next to rows with unrelated dates — reading as a stray, bogus
    // marker rather than the tie band it's supposed to be. Rather than
    // rewrite the rank/tie logic itself (display-rank.ts stays
    // adjacency-based for the default view), strip the "=" decoration here
    // whenever the board isn't in its default time order; each row still
    // shows its own real time rank.
    const rawDisplayRanks = computeDisplayRanks(
        leaderboard.entries,
        primaryTiming,
    );
    const displayRanks =
        sort === 'date'
            ? rawDisplayRanks.map((r) => ({
                  ...r,
                  tied: false,
                  label: `${r.rank}`,
              }))
            : rawDisplayRanks;
    // The gap block reads the rows either side of a run to answer "what does
    // it take to move up" — which only means anything while the board is in
    // rank order. Under a date sort the neighbours are whatever finished
    // nearby in time, so the gaps would be true numbers about arbitrary runs.
    // No standings then: the hover card drops the block entirely (it guards
    // on `standing != null`) rather than showing a misleading one.
    const standings =
        sort === 'date'
            ? []
            : computeRunStandings(
                  leaderboard.entries,
                  displayRanks,
                  leaderboard.entries.findIndex((e) =>
                      isSameRunner(e.runnerName, sessionUsername),
                  ),
              );
    // Row-level hide flags need the all-null override folded into the same
    // key the secondary column actually is (rt or gt — depends on
    // primaryTiming), not blanket-applied to gameTime.
    const rowHideRealTime =
        hideRealTime || (secondary.key === 'rt' && secondaryAllNull);
    const rowHideGameTime =
        hideGameTime || (secondary.key === 'gt' && secondaryAllNull);
    // Boards imported from speedrun.com often hold only whole-second times;
    // printing ".000" on every row is noise, so milliseconds show only when
    // at least one loaded time actually has them. Recomputed per page, same
    // as the secondary column.
    const boardShowMilliseconds =
        showMilliseconds &&
        leaderboard.entries.some((e) =>
            [e.realTime, e.gameTime].some(
                (t) => t != null && Math.round(t) % 1000 !== 0,
            ),
        );

    return (
        <div className={styles.wrapper}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {canManage && (
                            <th className={styles.checkCell}>
                                <input
                                    ref={selectAllRef}
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={allSelected}
                                    aria-label="Select all runs on this page"
                                    onChange={onToggleAllVisible}
                                    disabled={selectableKeys.length === 0}
                                />
                            </th>
                        )}
                        <th className={styles.rank}>#</th>
                        <th>Runner</th>
                        {!hidden(primary.key) && (
                            <th
                                className={styles.rankedHeader}
                                aria-label={`${primary.label} — ranking column`}
                            >
                                {primary.label}
                                {/* Only when a second time column exists —
                                    with one column there is nothing to
                                    disambiguate. */}
                                {!hidden(secondary.key) && (
                                    <span
                                        className={styles.rankedTag}
                                        aria-hidden="true"
                                    >
                                        Ranked
                                    </span>
                                )}
                            </th>
                        )}
                        {!hidden(secondary.key) && (
                            <th
                                className={`${styles.secondaryHeader} ${styles.secondaryTimeHeader}`}
                            >
                                {secondary.label}
                            </th>
                        )}
                        {visibleValueColumns.map((col) => (
                            <th key={col.key} className={styles.valueHeader}>
                                {col.label}
                            </th>
                        ))}
                        <th
                            className={`${styles.when} ${styles.secondaryHeader}`}
                            aria-sort={
                                onSort
                                    ? sort === 'date'
                                        ? dir === 'desc'
                                            ? 'descending'
                                            : 'ascending'
                                        : 'none'
                                    : undefined
                            }
                        >
                            {onSort ? (
                                <button
                                    type="button"
                                    className={styles.sortHeaderBtn}
                                    onClick={onSort}
                                    disabled={sortPending}
                                    aria-label={
                                        sort === 'date'
                                            ? `Sorted by date, ${
                                                  dir === 'desc'
                                                      ? 'newest first'
                                                      : 'oldest first'
                                              }. Activate to change sort.`
                                            : 'Sort by date'
                                    }
                                >
                                    Date
                                    {sort === 'date' && (
                                        <span aria-hidden="true">
                                            {dir === 'desc' ? ' ↓' : ' ↑'}
                                        </span>
                                    )}
                                </button>
                            ) : (
                                'Date'
                            )}
                        </th>
                        <th aria-label="Video, status and actions" />
                    </tr>
                </thead>
                <tbody>
                    {leaderboard.entries.map((entry, i) => (
                        <LeaderboardRow
                            key={
                                entry.runId ??
                                `${entry.runnerName}-${entry.rank}`
                            }
                            entry={entry}
                            displayRank={displayRanks[i]}
                            isCurrentUser={isSameRunner(
                                entry.runnerName,
                                sessionUsername,
                            )}
                            canManage={canManage}
                            gameSlug={gameSlug}
                            hideRealTime={rowHideRealTime}
                            hideGameTime={rowHideGameTime}
                            primaryTiming={primaryTiming}
                            valueColumns={visibleValueColumns}
                            showMilliseconds={boardShowMilliseconds}
                            gameTimeLabel={gameTimeLabel}
                            rtaFallback={rtaFallback}
                            standing={standings[i]}
                            selected={(() => {
                                const key = entrySelectionKey(entry);
                                return (
                                    key != null &&
                                    (selectedKeys?.has(key) ?? false)
                                );
                            })()}
                            onToggleSelect={onToggleSelect}
                            onQuickModerate={onQuickModerate}
                            onBoardRefresh={onBoardRefresh}
                            slots={slots}
                        />
                    ))}
                    {tbodyFooter}
                </tbody>
            </table>
        </div>
    );
}
