'use client';

import { useState } from 'react';
import { UserLink } from '~src/components/links/links';
import type { TopRunnerRow } from '~src/lib/game-top-runners';
import { formatCount, formatHours } from '~src/utils/format-stats';
import overviewStyles from '../overview/overview.module.scss';
import styles from './stats.module.scss';

const PERIODS = [
    { key: 'all', label: 'All time' },
    { key: 'd90', label: '90 days' },
    { key: 'd30', label: '30 days' },
] as const;

const METRICS = [
    { key: 'playtime', label: 'Hours' },
    { key: 'attempts', label: 'Attempts' },
    { key: 'pbs', label: 'PBs' },
] as const;

type PeriodKey = (typeof PERIODS)[number]['key'];
type MetricKey = (typeof METRICS)[number]['key'];

/** Rows shown before the expander; the pool behind it is 25 deep. */
const COLLAPSED_ROWS = 10;

interface Props {
    allTime: TopRunnerRow[];
    d90: TopRunnerRow[];
    d30: TopRunnerRow[];
}

/**
 * The overview's Top-runners section at full width: re-rankable by metric,
 * not just by period, and ten deep until asked for more — a 25-row wall was
 * the tallest thing on the page and the tail is never the point. Sorting
 * happens within the fetched pool (the backend ranks that pool by playtime),
 * so a runner outside the playtime top-100 can't appear under Attempts —
 * acceptable skew for a leaderboard this shape.
 */
export function TopRunnersTable({ allTime, d90, d30 }: Props) {
    const [period, setPeriod] = useState<PeriodKey>('all');
    const [metric, setMetric] = useState<MetricKey>('playtime');
    const [expanded, setExpanded] = useState(false);

    const pool = period === 'all' ? allTime : period === 'd90' ? d90 : d30;
    const sorted = [...pool].sort((a, b) => b[metric] - a[metric]);
    const rows = expanded ? sorted : sorted.slice(0, COLLAPSED_ROWS);
    const hidden = sorted.length - rows.length;

    // The column you ranked by is the one to read; the other two are context.
    const numClass = (key: MetricKey) =>
        key === metric
            ? `${overviewStyles.runnersNum} ${styles.runnersNumActive}`
            : overviewStyles.runnersNum;

    return (
        <div>
            <div className={styles.chartControls}>
                <div
                    className={styles.pillGroup}
                    role="group"
                    aria-label="Ranking metric"
                >
                    {METRICS.map((m) => (
                        <button
                            key={m.key}
                            type="button"
                            className={
                                m.key === metric
                                    ? styles.pillActive
                                    : styles.pill
                            }
                            aria-pressed={m.key === metric}
                            onClick={() => setMetric(m.key)}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
                <div
                    className={styles.pillGroup}
                    role="group"
                    aria-label="Period"
                >
                    {PERIODS.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            className={
                                p.key === period
                                    ? styles.pillActive
                                    : styles.pill
                            }
                            aria-pressed={p.key === period}
                            onClick={() => setPeriod(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>
            {rows.length === 0 ? (
                <p className={styles.sectionEmpty}>
                    No recorded activity in this period.
                </p>
            ) : (
                <>
                    <div className={overviewStyles.runnersTable}>
                        <div
                            className={`${overviewStyles.runnersRow} ${overviewStyles.runnersHeadRow}`}
                            aria-hidden
                        >
                            <span />
                            <span>Runner</span>
                            <span className={numClass('playtime')}>Hours</span>
                            <span className={numClass('attempts')}>
                                Attempts
                            </span>
                            <span className={numClass('pbs')}>PBs</span>
                        </div>
                        {rows.map((r, i) => (
                            <div
                                key={r.username}
                                className={overviewStyles.runnersRow}
                            >
                                <span
                                    className={`${overviewStyles.runnersRank} ${
                                        i === 0
                                            ? overviewStyles.rankGoldNum
                                            : i === 1
                                              ? overviewStyles.rankSilver
                                              : i === 2
                                                ? overviewStyles.rankBronze
                                                : ''
                                    }`}
                                >
                                    {i + 1}
                                </span>
                                <span className={overviewStyles.runnersName}>
                                    <UserLink
                                        username={r.username}
                                        url={undefined}
                                    />
                                </span>
                                <span className={numClass('playtime')}>
                                    {formatHours(r.playtime)}
                                </span>
                                <span className={numClass('attempts')}>
                                    {formatCount(r.attempts)}
                                </span>
                                <span className={numClass('pbs')}>
                                    {r.pbs > 0 ? formatCount(r.pbs) : '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                    {(hidden > 0 || expanded) && (
                        <button
                            type="button"
                            className={styles.moreButton}
                            aria-expanded={expanded}
                            onClick={() => setExpanded((v) => !v)}
                        >
                            {expanded
                                ? 'Show fewer'
                                : `Show all ${sorted.length}`}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
