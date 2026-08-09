import { type ReactNode, useEffect, useRef } from 'react';
import { Funnel, Trophy } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { buildSubmitHref } from '~src/lib/board-url';
import type {
    LeaderboardEntry,
    LeaderboardResponse,
} from '../../../../../types/leaderboards.types';
import { ClearFiltersButton } from '../filters/clear-filters-button';
import { isSameRunner } from '../shared/is-same-runner';
import { computeDisplayRanks } from './display-rank';
import styles from './leaderboard.module.scss';
import { LeaderboardRow, type RowSlots } from './leaderboard-row';
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
    /** Bulk selection — checkbox column only renders when `canManage`.
     * Keys are `r:<runId>` / `m:<manualTimeId>` (see selection.ts). */
    selectedKeys?: Set<BoardSelectionKey>;
    onToggleSelect?: (key: BoardSelectionKey, shiftKey: boolean) => void;
    /** Header checkbox — toggles every currently-rendered selectable row. */
    onToggleAllVisible?: () => void;
    /** Kebab's "Moderate…" — opens the run inspector on that entry. */
    onModerate?: (entry: LeaderboardEntry) => void;
    /** Board page refetch for row-level mutations (quick Verify + undo). */
    onBoardRefresh?: () => void;
    /** The board's category, forwarded to each row's Remove. */
    category?: { id: number; display: string };
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
    selectedKeys,
    onToggleSelect,
    onToggleAllVisible,
    onModerate,
    onBoardRefresh,
    category,
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
                            <Link
                                href={buildSubmitHref(gameSlug, {
                                    categorySlug,
                                    subcategoryKey,
                                })}
                                className={styles.emptyAction}
                            >
                                Submit the first run
                            </Link>
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
    const displayRanks = computeDisplayRanks(
        leaderboard.entries,
        primaryTiming,
    );
    // Row-level hide flags need the all-null override folded into the same
    // key the secondary column actually is (rt or gt — depends on
    // primaryTiming), not blanket-applied to gameTime.
    const rowHideRealTime =
        hideRealTime || (secondary.key === 'rt' && secondaryAllNull);
    const rowHideGameTime =
        hideGameTime || (secondary.key === 'gt' && secondaryAllNull);

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
                            <th className={styles.secondaryHeader}>
                                {secondary.label}
                            </th>
                        )}
                        {visibleValueColumns.map((col) => (
                            <th key={col.key} className={styles.valueHeader}>
                                {col.label}
                            </th>
                        ))}
                        <th className={styles.when}>When</th>
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
                            showMilliseconds={showMilliseconds}
                            rtaFallback={rtaFallback}
                            selected={(() => {
                                const key = entrySelectionKey(entry);
                                return (
                                    key != null &&
                                    (selectedKeys?.has(key) ?? false)
                                );
                            })()}
                            onToggleSelect={onToggleSelect}
                            onModerate={onModerate}
                            onBoardRefresh={onBoardRefresh}
                            category={category}
                            subcategoryDefKeys={subcategoryDefKeys}
                            slots={slots}
                        />
                    ))}
                    {tbodyFooter}
                </tbody>
            </table>
        </div>
    );
}
