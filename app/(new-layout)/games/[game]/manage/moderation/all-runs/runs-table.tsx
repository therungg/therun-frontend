'use client';

import moment from 'moment';
import { type KeyboardEvent, type MouseEvent, useState } from 'react';
import { DurationToFormatted, FromNow } from '~src/components/util/datetime';
import { rendersAsRoster } from '~src/lib/run-view/roster';
import { parseSubcategoryKey } from '~src/lib/variables/keys';
import type { AllRunsRow } from '../../../../../../../types/all-runs.types';
import { RowRoster } from '../shared/row-roster';
import type { AllRunsQuery, AllRunsSort } from './all-runs-params';
import styles from './runs-table.module.scss';

interface Props {
    /** null = first load. */
    rows: AllRunsRow[] | null;
    query: AllRunsQuery;
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

const SOURCE_LABELS: Record<string, string> = {
    run: 'timer',
    self: 'submitted',
    mod: 'submitted',
    src_import: 'import',
};

const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation();

export function RunsTable({
    rows,
    query,
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
            ?.filter((r) => r.categoryId === query.categoryId)
            .map((r) => r.id) ?? [];
    const pickedOnPage = pageIds.filter((id) => selected.has(id)).length;
    const allPicked = pageIds.length > 0 && pickedOnPage === pageIds.length;
    const somePicked = pickedOnPage > 0 && !allPicked;

    const sortHeader = (sort: AllRunsSort, label: string) => {
        const active = query.sort === sort;
        return (
            <th
                aria-sort={
                    active
                        ? query.dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                        : undefined
                }
            >
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
            </th>
        );
    };

    const columns = selectable ? 9 : 8;

    return (
        <div className="table-responsive">
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
                        {sortHeader('arrived', 'Arrived')}
                        {sortHeader('date', 'Run date')}
                        {sortHeader('runner', 'Runner')}
                        {sortHeader('category', 'Category')}
                        {query.categoryId != null ? (
                            sortHeader('time', 'Time')
                        ) : (
                            <th>Time</th>
                        )}
                        <th>Status</th>
                        <th>Video</th>
                        <th>Source</th>
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
                                  fresh={
                                      now - new Date(row.arrivedAt).getTime() <
                                      HOUR_MS
                                  }
                                  selectable={selectable}
                                  pickable={
                                      pickable &&
                                      row.categoryId === query.categoryId
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

function RunRow({
    row,
    fresh,
    selectable,
    pickable,
    checked,
    onToggle,
    onOpenRun,
    onOpenRunner,
}: {
    row: AllRunsRow;
    fresh: boolean;
    selectable: boolean;
    pickable: boolean;
    checked: boolean;
    onToggle: (id: number) => void;
    onOpenRun: (row: AllRunsRow) => void;
    onOpenRunner: (row: AllRunsRow) => void;
}) {
    const sub = parseSubcategoryKey(row.subcategoryKey)
        .map((p) => p.value)
        .filter(Boolean)
        .join(' · ');
    const gamePrimary = row.primaryTiming === 'gametime';
    // A game-time board ranks a run without one by its real time.
    const primary = gamePrimary ? (row.gameTime ?? row.time) : row.time;
    const secondary = gamePrimary
        ? row.gameTime != null
            ? row.time
            : null
        : row.gameTime;
    const coop = rendersAsRoster(row.participants, row);

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
            <td className={styles.nowrap}>
                <FromNow time={row.arrivedAt} />
            </td>
            <td className={styles.nowrap}>
                {moment(row.endedAt).format('MMM D YYYY')}
            </td>
            <td>
                {coop ? (
                    // Roster names are links; they must not open the row.
                    <span onClick={stop} onKeyDown={stop}>
                        <RowRoster
                            participants={row.participants}
                            filer={row}
                        />
                    </span>
                ) : row.userId == null ? (
                    <span>
                        {row.runnerName}{' '}
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
            <td>
                <span className={styles.category}>{row.categoryDisplay}</span>
                {sub && <span className={styles.sub}>{sub}</span>}
            </td>
            <td className={styles.time}>
                <DurationToFormatted duration={primary} />
                {secondary != null && (
                    <span className={styles.secondary}>
                        <DurationToFormatted duration={secondary} />
                    </span>
                )}
            </td>
            <td className={styles.nowrap}>
                <Status row={row} />
            </td>
            <td>
                {row.vodUrl ? (
                    <a
                        className={styles.video}
                        href={row.vodUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open video"
                        onClick={stop}
                        onKeyDown={stop}
                    >
                        ▶
                    </a>
                ) : (
                    <span className={styles.muted}>—</span>
                )}
            </td>
            <td className={styles.source}>
                {row.source == null
                    ? ''
                    : (SOURCE_LABELS[row.source] ?? row.source)}
            </td>
        </tr>
    );
}

function Status({ row }: { row: AllRunsRow }) {
    let label: string;
    let tone: string;
    switch (row.position) {
        case 'board':
            label = 'On board';
            tone = styles.pillBoard;
            break;
        case 'beaten':
            label = 'Beaten';
            tone = styles.pillBeaten;
            break;
        case 'held':
            {
                const reason =
                    row.ineligibleReason != null
                        ? HELD_LABELS[row.ineligibleReason]
                        : undefined;
                label = reason ? `Held · ${reason}` : 'Held';
            }
            tone = styles.pillHeld;
            break;
        default:
            label = 'Rejected';
            tone = styles.pillRejected;
    }
    if (row.position === 'board' && row.onBoardClock === 'secondary') {
        label +=
            row.primaryTiming === 'realtime' ? ' · game time' : ' · real time';
    }
    return (
        <span className={styles.status}>
            <span className={tone}>{label}</span>
            {row.position !== 'rejected' &&
                row.verificationStatus !== 'rejected' && (
                    <span className={styles.tag}>{row.verificationStatus}</span>
                )}
        </span>
    );
}
