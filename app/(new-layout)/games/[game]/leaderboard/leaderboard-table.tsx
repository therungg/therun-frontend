import { type ReactNode, useEffect, useRef } from 'react';
import { Funnel, Trophy } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import {
    millisecondsFor,
    millisecondsKey,
    resolveMillisecondsMode,
} from '~src/lib/milliseconds-mode';
import { isYourRow, rendersAsRoster } from '~src/lib/run-view/roster';
import type {
    LeaderboardEntry,
    LeaderboardResponse,
    MillisecondsMode,
} from '../../../../../types/leaderboards.types';
import { ClearFiltersButton } from '../filters/clear-filters-button';
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
    /** The board's precision setting. Absent falls back to
     * `showMilliseconds`, which is all a host that has one passes. */
    millisecondsMode?: MillisecondsMode;
    /** category.showMilliseconds — the boolean half of the setting above,
     * kept for hosts that hold one (curation renders this same table). */
    showMilliseconds?: boolean;
    /** Draws the Platform column. Only true when the category's runs span
     * more than one platform — with one value the column is a repeated word,
     * and with none there is nothing to say. */
    showPlatform?: boolean;
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
    /** Disables the Date header's sort button while a sort fetch is in flight,
     * and dims the rows underneath — they are the old order until it lands. */
    sortPending?: boolean;
    /** Which header started the in-flight re-rank — `ranked`, `secondary` or
     * `date` — so the ring sits next to the label that was clicked rather
     * than on every sortable header at once. */
    pendingColumn?: string | null;
    /** Present only when the host wants the ranked time column clickable.
     * Returns the board to its record order — fastest first, always. A
     * leaderboard has no slowest-first reading, so this selects rather than
     * toggles, and does nothing when the board is already in that order. */
    onRankedSelect?: () => void;
    /** Present only when the host wants the OTHER time column clickable;
     * fires with that column's clock and re-ranks the whole board by it —
     * the "Ranked" tag and the column order follow, because both derive from
     * `primaryTiming`. Omit to leave the secondary header inert. */
    onTimingSelect?: (key: TimingKey) => void;
    /** Bulk selection — checkbox column only renders when `canManage`.
     * Keys are `r:<runId>` / `m:<manualTimeId>` (see selection.ts). */
    selectedKeys?: Set<BoardSelectionKey>;
    onToggleSelect?: (key: BoardSelectionKey, shiftKey: boolean) => void;
    /** Header checkbox — toggles every currently-rendered selectable row. */
    onToggleAllVisible?: () => void;
    /** Opens the moderate modal on a row's entry. Moderators only. */
    onModerate?: (entry: LeaderboardEntry) => void;
    /** Selection key of the row whose Moderate click is still loading the
     * game's moderation context. First click only — the context is fetched
     * once per session, and until it lands the modal cannot open. */
    moderatePendingKey?: BoardSelectionKey | null;
    /** Opens the moderate modal on a row's runner (Runner tab). Moderators
     * only; a row with no linked account never calls it. */
    onModerateRunner?: (userId: number, runnerName: string) => void;
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
    millisecondsMode,
    showMilliseconds,
    showPlatform = false,
    categorySlug,
    subcategoryKey,
    subcategoryDefKeys,
    rtaFallback = false,
    sort,
    dir,
    onSort,
    sortPending = false,
    pendingColumn = null,
    onRankedSelect,
    onTimingSelect,
    selectedKeys,
    onToggleSelect,
    onToggleAllVisible,
    onModerate,
    moderatePendingKey = null,
    onModerateRunner,
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
    // Imported boards often hold only whole-second times; printing ".000" on
    // every row is noise, so an always board drops to never when no loaded
    // time actually has milliseconds. Recomputed per page, same as the
    // secondary column. A tied board needs no such guard — a list of whole
    // seconds only prints decimals where two of them collide, which is
    // exactly the case worth showing.
    const anyMillis = leaderboard.entries.some((e) =>
        [e.realTime, e.gameTime].some(
            (t) => t != null && Math.round(t) % 1000 !== 0,
        ),
    );
    const mode = resolveMillisecondsMode({
        millisecondsMode,
        showMilliseconds,
    });
    const effectiveMode: MillisecondsMode =
        mode === 'always' && !anyMillis ? 'never' : mode;
    // The clock the rows are actually shown by — the ranking column, with the
    // same RTA substitution the row's leading cell makes. Ties are read off
    // that clock, because that is the number a reader sees repeated.
    const displayedClock = (e: LeaderboardEntry): number | null =>
        rtaFallback && primary.key === 'gt' && e.gameTime == null
            ? e.realTime
            : timingValue(e, primary.key);
    const millisRows = millisecondsFor(
        leaderboard.entries,
        effectiveMode,
        displayedClock,
    );
    // The runner column names whoever a row credits. `coopBoard` alone isn't
    // enough — it's true only when a players POLICY exists, and most co-op
    // boards (imported ones especially) have team rows with no policy
    // configured at all, so trusting the field exclusively read "Runner"
    // over rows naming three people. Plural when EITHER the board says so OR
    // any row on this page actually renders as a roster — `rendersAsRoster`,
    // not a bare length check, so a one-member roster that isn't the filer
    // (someone else's solo remainder) still counts.
    const boardCreditsTeams =
        leaderboard.coopBoard === true ||
        leaderboard.entries.some((e) =>
            rendersAsRoster(e.participants, {
                runnerName: e.runnerName,
                userId: e.userId,
            }),
        );

    return (
        <div
            className={
                sortPending
                    ? `${styles.wrapper} ${styles.rowsPending}`
                    : styles.wrapper
            }
            aria-busy={sortPending || undefined}
        >
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
                        <th>{boardCreditsTeams ? 'Runners' : 'Runner'}</th>
                        {!hidden(primary.key) && (
                            <th
                                className={styles.rankedHeader}
                                aria-label={`${primary.label} — ranking column`}
                                // Records are always fastest-first, so this
                                // column is only ever ascending — and a
                                // date-sorted board isn't ordered by it at
                                // all, so it reports no direction then.
                                aria-sort={
                                    onRankedSelect && sort !== 'date'
                                        ? 'ascending'
                                        : undefined
                                }
                            >
                                {onRankedSelect ? (
                                    <button
                                        type="button"
                                        className={styles.sortHeaderBtn}
                                        onClick={onRankedSelect}
                                        disabled={sortPending}
                                        aria-busy={
                                            pendingColumn === 'ranked'
                                                ? true
                                                : undefined
                                        }
                                        title={`Rank this board by ${primary.label.toLowerCase()}, fastest first`}
                                    >
                                        {primary.label}
                                        {pendingColumn === 'ranked' && (
                                            <span
                                                aria-hidden
                                                className={styles.sortSpinner}
                                            />
                                        )}
                                    </button>
                                ) : (
                                    primary.label
                                )}
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
                                {onTimingSelect ? (
                                    <button
                                        type="button"
                                        className={styles.sortHeaderBtn}
                                        onClick={() =>
                                            onTimingSelect(secondary.key)
                                        }
                                        disabled={sortPending}
                                        aria-busy={
                                            pendingColumn === 'secondary'
                                                ? true
                                                : undefined
                                        }
                                        title={`Rank this board by ${secondary.label.toLowerCase()}`}
                                    >
                                        {secondary.label}
                                        {pendingColumn === 'secondary' && (
                                            <span
                                                aria-hidden
                                                className={styles.sortSpinner}
                                            />
                                        )}
                                    </button>
                                ) : (
                                    secondary.label
                                )}
                            </th>
                        )}
                        {visibleValueColumns.map((col) => (
                            <th key={col.key} className={styles.valueHeader}>
                                {col.label}
                            </th>
                        ))}
                        {showPlatform && (
                            <th className={styles.platformHeader}>Platform</th>
                        )}
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
                                    aria-busy={
                                        pendingColumn === 'date'
                                            ? true
                                            : undefined
                                    }
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
                                    {pendingColumn === 'date' && (
                                        <span
                                            aria-hidden
                                            className={styles.sortSpinner}
                                        />
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
                            isCurrentUser={isYourRow(
                                entry.participants,
                                entry.runnerName,
                                sessionUsername,
                            )}
                            canManage={canManage}
                            gameSlug={gameSlug}
                            hideRealTime={rowHideRealTime}
                            hideGameTime={rowHideGameTime}
                            primaryTiming={primaryTiming}
                            valueColumns={visibleValueColumns}
                            withMillis={millisRows.has(
                                millisecondsKey(entry, i),
                            )}
                            millisecondsMode={effectiveMode}
                            showPlatform={showPlatform}
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
                            onModerate={onModerate}
                            moderatePending={(() => {
                                if (moderatePendingKey == null) return false;
                                return (
                                    entrySelectionKey(entry) ===
                                    moderatePendingKey
                                );
                            })()}
                            onModerateRunner={onModerateRunner}
                            slots={slots}
                        />
                    ))}
                    {tbodyFooter}
                </tbody>
            </table>
        </div>
    );
}
