'use client';

import moment from 'moment';
import { type KeyboardEvent, type MouseEvent, useState } from 'react';
import { DurationToFormatted, FromNow } from '~src/components/util/datetime';
import { rendersAsRoster } from '~src/lib/run-view/roster';
import {
    normalizeVariableName,
    parseSubcategoryKey,
} from '~src/lib/variables/keys';
import type { AllRunsRow } from '../../../../../../../types/all-runs.types';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
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

export const HELD_LABELS: Record<string, string> = {
    missing_video: 'no video',
    awaiting_runner: 'awaiting runner',
    mod_override: 'kept off by a mod',
    stale_timer_attempt: 'stale attempt',
};

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
        <div className={`table-responsive ${styles.frame}`}>
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
                        : rows.map((row) => (
                              <RunRow
                                  key={row.id}
                                  row={row}
                                  variables={variables}
                                  showArrived={query.sort !== 'date'}
                                  fresh={
                                      now - new Date(row.arrivedAt).getTime() <
                                      HOUR_MS
                                  }
                                  selectable={selectable}
                                  pickable={
                                      pickable &&
                                      row.categoryId === oneCategory(query)
                                  }
                                  checked={selected.has(row.id)}
                                  onToggle={onToggle}
                                  onOpenRun={onOpenRun}
                                  onOpenRunner={onOpenRunner}
                              />
                          ))}
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
                        title={`Run date ${moment(row.endedAt).format('MMM D YYYY')}`}
                    >
                        <FromNow time={row.arrivedAt} />
                    </span>
                ) : (
                    moment(row.endedAt).format('MMM D YYYY')
                )}
            </td>
            <td className={styles.runnerCell}>
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
                <DurationToFormatted duration={primary} />
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
                <span className={styles.source}>
                    {SOURCE_LABELS[row.sourceKind] ?? ''}
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
    let label = row.position === 'board' ? 'On board' : 'Beaten';
    if (row.position === 'board' && row.onBoardClock === 'secondary') {
        label +=
            row.primaryTiming === 'realtime' ? ' · game time' : ' · real time';
    }
    return (
        <span className={styles.status}>
            <span
                className={
                    row.position === 'board' ? styles.onBoard : styles.beaten
                }
            >
                {label}
            </span>
            {row.verificationStatus === 'pending' && (
                <span className={styles.pillPending}>Pending</span>
            )}
        </span>
    );
}

function PlayIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden
        >
            <rect x="1.5" y="3" width="13" height="10" rx="2.5" />
            <path d="M6.75 6.1v3.8L9.9 8z" fill="currentColor" stroke="none" />
        </svg>
    );
}
