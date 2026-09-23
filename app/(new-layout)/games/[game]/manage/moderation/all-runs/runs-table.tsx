'use client';

import moment from 'moment';
import { type KeyboardEvent, type MouseEvent, useState } from 'react';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatDuration } from '~src/lib/duration';
import { HELD_LABEL as HELD_LABELS } from '~src/lib/moderation/run-status-copy';
import { rendersAsRoster } from '~src/lib/run-view/roster';
import {
    normalizeVariableName,
    parseSubcategoryKey,
} from '~src/lib/variables/keys';
import type { AllRunsRow } from '../../../../../../../types/all-runs.types';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import { CountryFlag } from '../../../leaderboard/country-flag';
import { RunnerAvatar } from '../../../leaderboard/runner-avatar';
import {
    type AllRunsQuery,
    type AllRunsSort,
    oneCategory,
} from './all-runs-params';
import styles from './runs-table.module.scss';

interface Props {
    /** null = first load. */
    rows: AllRunsRow[] | null;
    query: AllRunsQuery;
    /** For the subcategory's display labels. */
    variables: VariableRow[];
    /** Only with a category picked: the bulk sheet works on one board. */
    selectable: boolean;
    /** False while a read is in flight: the rows may be another query's. */
    pickable: boolean;
    selected: Set<number>;
    onToggle: (id: number) => void;
    onTogglePage: () => void;
    onSort: (sort: AllRunsSort) => void;
    onOpenRun: (row: AllRunsRow) => void;
    onOpenRunner: (row: AllRunsRow) => void;
}

const SKELETON_ROWS = 8;
const HOUR_MS = 60 * 60 * 1000;

export { HELD_LABELS };

const SOURCE_LABELS: Record<AllRunsRow['sourceKind'], string> = {
    livesplit: 'LiveSplit',
    manual: 'Manual',
    import: 'Imported',
};

const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation();

export function RunsTable({
    rows,
    query,
    variables,
    selectable,
    pickable,
    selected,
    onToggle,
    onTogglePage,
    onSort,
    onOpenRun,
    onOpenRunner,
}: Props) {
    // Fixed at mount: the edge marks what was new when the page was opened.
    const [now] = useState(() => Date.now());

    const pageIds =
        rows
            ?.filter((r) => r.categoryId === oneCategory(query))
            .map((r) => r.id) ?? [];
    const pickedOnPage = pageIds.filter((id) => selected.has(id)).length;
    const allPicked = pageIds.length > 0 && pickedOnPage === pageIds.length;
    const somePicked = pickedOnPage > 0 && !allPicked;

    const renderRow = (row: AllRunsRow) => (
        <RunRow
            key={row.id}
            row={row}
            variables={variables}
            showArrived={query.sort !== 'date'}
            fresh={now - new Date(row.arrivedAt).getTime() < HOUR_MS}
            selectable={selectable}
            pickable={pickable && row.categoryId === oneCategory(query)}
            checked={selected.has(row.id)}
            onToggle={onToggle}
            onOpenRun={onOpenRun}
            onOpenRunner={onOpenRunner}
        />
    );

    const sortButton = (sort: AllRunsSort, label: string) => {
        const active = query.sort === sort;
        return (
            <button
                type="button"
                className={active ? styles.sortActive : styles.sort}
                onClick={() => onSort(sort)}
            >
                {label}
                {active && (
                    <span className={styles.arrow} aria-hidden>
                        {query.dir === 'asc' ? '↑' : '↓'}
                    </span>
                )}
            </button>
        );
    };
    const sortHeader = (sort: AllRunsSort, label: string) => (
        <th
            aria-sort={
                query.sort === sort
                    ? query.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                    : undefined
            }
        >
            {sortButton(sort, label)}
        </th>
    );

    const columns = selectable ? 7 : 6;

    return (
        <div className={styles.frame}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {selectable && (
                            <th className={styles.check}>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    aria-label="Select all runs on this page"
                                    checked={allPicked}
                                    ref={(el) => {
                                        if (el) el.indeterminate = somePicked;
                                    }}
                                    disabled={!pickable || pageIds.length === 0}
                                    onChange={onTogglePage}
                                />
                            </th>
                        )}
                        <th
                            aria-sort={
                                query.sort === 'arrived' ||
                                query.sort === 'date'
                                    ? query.dir === 'asc'
                                        ? 'ascending'
                                        : 'descending'
                                    : undefined
                            }
                        >
                            {/* One column, sorted either way: it shows the
                                date it is sorted by. */}
                            <span className={styles.whenSorts}>
                                {sortButton('arrived', 'Arrived')}
                                <span aria-hidden>·</span>
                                {sortButton('date', 'Run date')}
                            </span>
                        </th>
                        {sortHeader('runner', 'Runner')}
                        {sortHeader('category', 'Category')}
                        {oneCategory(query) != null ? (
                            sortHeader('time', 'Time')
                        ) : (
                            <th>Time</th>
                        )}
                        <th>Status</th>
                        <th>
                            <span className="visually-hidden">Source</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows == null
                        ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
                              <tr key={i} aria-hidden>
                                  {Array.from({ length: columns }, (_, c) => (
                                      <td key={c}>
                                          <span className={styles.skeleton} />
                                      </td>
                                  ))}
                              </tr>
                          ))
                        : rows.map(renderRow)}
                </tbody>
            </table>
        </div>
    );
}

/** A subcategory key's values as the board labels them, not normalized. */
function subcategoryLabel(row: AllRunsRow, variables: VariableRow[]): string {
    return parseSubcategoryKey(row.subcategoryKey)
        .filter((p) => p.value)
        .map((p) => {
            const variable = variables.find(
                (v) =>
                    v.categoryId === row.categoryId &&
                    v.role === 'subcategory' &&
                    v.nameNormalized === p.name,
            );
            return (
                variable?.values.find(
                    (v) => normalizeVariableName(v[0]) === p.value,
                )?.[0] ?? p.value
            );
        })
        .join(' · ');
}

function RunRow({
    row,
    variables,
    showArrived,
    fresh,
    selectable,
    pickable,
    checked,
    onToggle,
    onOpenRun,
    onOpenRunner,
}: {
    row: AllRunsRow;
    variables: VariableRow[];
    /** The When cell shows arrival unless the table is sorted by run date. */
    showArrived: boolean;
    fresh: boolean;
    selectable: boolean;
    pickable: boolean;
    checked: boolean;
    onToggle: (id: number) => void;
    onOpenRun: (row: AllRunsRow) => void;
    onOpenRunner: (row: AllRunsRow) => void;
}) {
    const sub = subcategoryLabel(row, variables);
    const gamePrimary = row.primaryTiming === 'gametime';
    // A game-time board ranks a run without one by its real time.
    const primary = gamePrimary ? (row.gameTime ?? row.time) : row.time;
    const secondary = gamePrimary
        ? row.gameTime != null
            ? row.time
            : null
        : row.gameTime;
    const roster = rendersAsRoster(row.participants, row)
        ? row.participants
        : null;
    // The face and flag beside the name: the first seat of a co-op run.
    const lead = roster
        ? {
              name: roster[0].name,
              picture: roster[0].picture,
              country: roster[0].country,
          }
        : { name: row.runnerName, picture: row.picture, country: row.country };
    // Rank for runs on the board or waiting to be; a beaten run has none.
    const rank =
        row.position === 'beaten' || row.position === 'rejected'
            ? null
            : row.boardRank;
    // Against the runner's own best before this run: a big drop is the first
    // thing worth a second look.
    // Shown only beside a rank: on a beaten run it describes an improvement
    // that has since been beaten.
    const delta =
        rank != null && row.prevBest != null ? primary - row.prevBest : null;
    const bigJump =
        delta != null &&
        delta < 0 &&
        row.prevBest != null &&
        -delta >= row.prevBest * 0.1;

    return (
        <tr
            className={fresh ? `${styles.row} ${styles.fresh}` : styles.row}
            tabIndex={0}
            onClick={() => onOpenRun(row)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target === e.currentTarget) {
                    onOpenRun(row);
                }
            }}
        >
            {selectable && (
                <td className={styles.check} onClick={stop}>
                    <input
                        type="checkbox"
                        className="form-check-input"
                        aria-label={`Select run by ${row.runnerName}`}
                        checked={pickable && checked}
                        disabled={!pickable}
                        onChange={() => onToggle(row.id)}
                    />
                </td>
            )}
            <td className={styles.when}>
                {showArrived ? (
                    <span
                        title={`Arrived ${moment(row.arrivedAt).format('LLL')} · run date ${moment(row.endedAt).format('MMM D YYYY')}`}
                    >
                        {compactAgo(row.arrivedAt)}
                    </span>
                ) : (
                    moment(row.endedAt).format('MMM D YYYY')
                )}
            </td>
            <td className={styles.runnerCell}>
                <span className={styles.who}>
                    <RunnerAvatar
                        name={lead.name}
                        picture={lead.picture}
                        size="xs"
                    />
                    {roster ? (
                        // First seat plus a count; the whole roster on hover and
                        // in the sheet the row opens.
                        <span
                            className={styles.one}
                            title={roster.map((p) => p.name).join(', ')}
                        >
                            <span className={styles.runnerName}>
                                {roster[0].name}
                            </span>
                            {roster.length > 1 && (
                                <span className={styles.more}>
                                    +{roster.length - 1}
                                </span>
                            )}
                        </span>
                    ) : row.userId == null ? (
                        <span className={styles.one}>
                            <span className={styles.runnerName}>
                                {row.runnerName}
                            </span>
                            <span className={styles.guest}>guest</span>
                        </span>
                    ) : (
                        <button
                            type="button"
                            className={styles.runner}
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenRunner(row);
                            }}
                            onKeyDown={stop}
                        >
                            {row.runnerName}
                        </button>
                    )}
                    <CountryFlag country={lead.country} />
                </span>
            </td>
            <td className={styles.categoryCell}>
                <span
                    className={styles.one}
                    title={
                        sub
                            ? `${row.categoryDisplay} · ${sub}`
                            : row.categoryDisplay
                    }
                >
                    <span className={styles.category}>
                        {row.categoryDisplay}
                    </span>
                    {sub && <span className={styles.sub}>{sub}</span>}
                </span>
            </td>
            <td className={styles.time}>
                {/* Fixed slots so every time lines up down the column. */}
                <span className={styles.timeGrid}>
                    <span className={styles.rank}>
                        {rank != null ? `#${rank}` : ''}
                    </span>
                    <span className={styles.timeValue}>
                        <DurationToFormatted duration={primary} />
                    </span>
                    <span className={styles.deltaSlot}>
                        {delta != null && (
                            <span
                                className={
                                    bigJump ? styles.deltaJump : styles.delta
                                }
                                title={`Previous best ${formatDuration(row.prevBest ?? 0)}`}
                            >
                                {bigJump
                                    ? '▼ '
                                    : delta < 0
                                      ? '−'
                                      : delta > 0
                                        ? '+'
                                        : '±'}
                                {formatDuration(Math.abs(delta))}
                            </span>
                        )}
                    </span>
                </span>
                {secondary != null && (
                    <span className={styles.secondary}>
                        <DurationToFormatted duration={secondary} />
                    </span>
                )}
            </td>
            <td className={styles.statusCell}>
                <Status row={row} />
            </td>
            <td className={styles.meta}>
                <span
                    className={styles.sourceIcon}
                    title={SOURCE_LABELS[row.sourceKind] ?? ''}
                    role="img"
                    aria-label={SOURCE_LABELS[row.sourceKind] ?? ''}
                >
                    <SourceIcon kind={row.sourceKind} />
                </span>
                {row.vodUrl ? (
                    <a
                        className={styles.video}
                        href={row.vodUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open video"
                        title="Open video"
                        onClick={stop}
                        onKeyDown={stop}
                    >
                        <PlayIcon />
                    </a>
                ) : row.hasVideo ? (
                    // Video only in the run's list of links: no single one to open.
                    <span className={styles.videoMark} title="Has video">
                        <PlayIcon />
                    </span>
                ) : (
                    <span className={styles.noVideo} title="No video">
                        <PlayIcon />
                    </span>
                )}
            </td>
        </tr>
    );
}

/** Quiet unless a mod has something to do: the position is plain text, and
 *  only pending, held and rejected runs carry a coloured pill. */
function Status({ row }: { row: AllRunsRow }) {
    if (row.position === 'rejected' || row.verificationStatus === 'rejected') {
        return <span className={styles.pillRejected}>Rejected</span>;
    }
    if (row.position === 'held') {
        const reason =
            row.ineligibleReason != null
                ? HELD_LABELS[row.ineligibleReason]
                : undefined;
        return (
            <span className={styles.pillHeld}>
                {reason ? `Held · ${reason}` : 'Held'}
            </span>
        );
    }
    // On the board is the normal case and says nothing; only a board held
    // on the other clock, a beaten run or a pending one gets a word.
    let label: string | null = null;
    if (row.position === 'beaten') label = 'Beaten';
    else if (row.onBoardClock === 'secondary') {
        label =
            row.primaryTiming === 'realtime'
                ? 'On board · game time'
                : 'On board · real time';
    }
    if (label == null && row.verificationStatus !== 'pending') return null;
    return (
        <span className={styles.status}>
            {label && (
                <span
                    className={
                        row.position === 'board'
                            ? styles.onBoard
                            : styles.beaten
                    }
                >
                    {label}
                </span>
            )}
            {row.verificationStatus === 'pending' && (
                <span className={styles.pillPending}>Pending</span>
            )}
        </span>
    );
}

/** "now", "12m", "13h", "4d", then the date: the column stays narrow. */
function compactAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60_000);
    if (min < 1) return 'now';
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d`;
    return moment(iso).format(
        moment(iso).isSame(moment(), 'year') ? 'MMM D' : 'MMM D YYYY',
    );
}

function PlayIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
            <circle
                cx="8"
                cy="8"
                r="6.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
            />
            <path d="M6.6 5.3v5.4L10.9 8z" fill="currentColor" />
        </svg>
    );
}

/** LiveSplit: a stopwatch. Imported: an arrow into a tray. Manual: a pen. */
function SourceIcon({ kind }: { kind: AllRunsRow['sourceKind'] }) {
    const common = {
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.3,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true,
    };
    if (kind === 'livesplit') {
        return (
            <svg {...common}>
                <circle cx="8" cy="9" r="5.2" />
                <path d="M8 9V6.4M6.6 2h2.8M8 2v1.8" />
            </svg>
        );
    }
    if (kind === 'import') {
        return (
            <svg {...common}>
                <path d="M8 2.2v7M5.2 6.6 8 9.4l2.8-2.8" />
                <path d="M2.6 10.4v2.4h10.8v-2.4" />
            </svg>
        );
    }
    return (
        <svg {...common}>
            <path d="m10.4 2.8 2.8 2.8-7.4 7.4H3v-2.8z" />
            <path d="m9 4.2 2.8 2.8" />
        </svg>
    );
}
