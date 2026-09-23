'use client';

import moment from 'moment';
import { type KeyboardEvent, type MouseEvent, useState } from 'react';
import { DurationToFormatted, FromNow } from '~src/components/util/datetime';
import { formatDuration } from '~src/lib/duration';
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

const BATCH_VERB: Record<AllRunsRow['sourceKind'], string> = {
    import: 'runs imported',
    livesplit: 'runs synced from LiveSplit',
    manual: 'runs entered',
};

/** Runs that arrived this close together, from one source, came in as one
 *  import or sync; five or more fold into a single row. */
const BATCH_GAP_MS = 2 * 60 * 1000;
const BATCH_MIN = 5;

type FeedItem =
    | { kind: 'day'; key: string; label: string }
    | { kind: 'batch'; key: number; rows: AllRunsRow[] }
    | { kind: 'row'; row: AllRunsRow };

function dayLabel(iso: string): string {
    const d = moment(iso);
    if (d.isSame(moment(), 'day')) return 'Today';
    if (d.isSame(moment().subtract(1, 'day'), 'day')) return 'Yesterday';
    return d.format(d.isSame(moment(), 'year') ? 'dddd, MMM D' : 'MMM D YYYY');
}

/** Date-sorted pages read as a feed: a heading per day, batches folded.
 *  Other sorts are a plain list. */
function feedItems(rows: AllRunsRow[], sort: AllRunsSort): FeedItem[] {
    if (sort !== 'arrived' && sort !== 'date') {
        return rows.map((row) => ({ kind: 'row', row }));
    }
    const at = (r: AllRunsRow) =>
        sort === 'arrived' ? r.arrivedAt : r.endedAt;
    const items: FeedItem[] = [];
    let day = '';
    let i = 0;
    while (i < rows.length) {
        const key = moment(at(rows[i])).format('YYYY-MM-DD');
        if (key !== day) {
            day = key;
            items.push({
                kind: 'day',
                key: `day:${key}`,
                label: dayLabel(at(rows[i])),
            });
        }
        let j = i + 1;
        if (sort === 'arrived') {
            while (
                j < rows.length &&
                rows[j].sourceKind === rows[i].sourceKind &&
                moment(at(rows[j])).format('YYYY-MM-DD') === key &&
                Math.abs(
                    new Date(rows[j - 1].arrivedAt).getTime() -
                        new Date(rows[j].arrivedAt).getTime(),
                ) <= BATCH_GAP_MS
            ) {
                j++;
            }
        }
        if (j - i >= BATCH_MIN) {
            items.push({
                kind: 'batch',
                key: rows[i].id,
                rows: rows.slice(i, j),
            });
            i = j;
        } else {
            items.push({ kind: 'row', row: rows[i] });
            i++;
        }
    }
    return items;
}

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

    // Batches start folded; a click opens one.
    const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
    const toggleBatch = (key: number) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

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
                        : feedItems(rows, query.sort).map((item) => {
                              if (item.kind === 'day') {
                                  return (
                                      <tr
                                          key={item.key}
                                          className={styles.dayRow}
                                      >
                                          <td colSpan={columns}>
                                              {item.label}
                                          </td>
                                      </tr>
                                  );
                              }
                              if (item.kind === 'batch') {
                                  const open = expanded.has(item.key);
                                  return [
                                      <tr
                                          key={item.key}
                                          className={styles.batchRow}
                                      >
                                          <td colSpan={columns}>
                                              <button
                                                  type="button"
                                                  className={styles.batchToggle}
                                                  aria-expanded={open}
                                                  onClick={() =>
                                                      toggleBatch(item.key)
                                                  }
                                              >
                                                  <span
                                                      className={
                                                          open
                                                              ? `${styles.chevron} ${styles.chevronOpen}`
                                                              : styles.chevron
                                                      }
                                                      aria-hidden
                                                  />
                                                  <b>{item.rows.length}</b>{' '}
                                                  {
                                                      BATCH_VERB[
                                                          item.rows[0]
                                                              .sourceKind
                                                      ]
                                                  }{' '}
                                                  together
                                                  <span
                                                      className={
                                                          styles.batchWhen
                                                      }
                                                  >
                                                      <FromNow
                                                          time={
                                                              item.rows[0]
                                                                  .arrivedAt
                                                          }
                                                      />
                                                  </span>
                                              </button>
                                          </td>
                                      </tr>,
                                      ...(open ? item.rows.map(renderRow) : []),
                                  ];
                              }
                              return renderRow(item.row);
                          })}
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
    const delta = row.prevBest != null ? primary - row.prevBest : null;
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
                        title={`Run date ${moment(row.endedAt).format('MMM D YYYY')}`}
                    >
                        <FromNow time={row.arrivedAt} />
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
                {rank != null && <span className={styles.rank}>#{rank}</span>}
                <DurationToFormatted duration={primary} />
                {secondary != null && (
                    <span className={styles.secondary}>
                        <DurationToFormatted duration={secondary} />
                    </span>
                )}
                {delta != null && (
                    <span
                        className={
                            bigJump
                                ? styles.deltaJump
                                : delta < 0
                                  ? styles.deltaFaster
                                  : styles.deltaSlower
                        }
                        title={`Previous best ${formatDuration(row.prevBest ?? 0)}`}
                    >
                        {delta < 0 ? '−' : delta > 0 ? '+' : '±'}
                        {formatDuration(Math.abs(delta))}
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
