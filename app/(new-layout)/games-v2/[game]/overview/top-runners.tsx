'use client';

import { useState } from 'react';
import { UserLink } from '~src/components/links/links';
import type { TopRunnerRow } from '~src/lib/game-top-runners';
import { formatCount, formatHours } from '~src/utils/format-stats';
import styles from './overview.module.scss';

const PERIODS = [
    { key: 'all', label: 'All time' },
    { key: 'd90', label: '90 days' },
    { key: 'd30', label: '30 days' },
] as const;

type PeriodKey = (typeof PERIODS)[number]['key'];

interface Props {
    allTime: TopRunnerRow[];
    d90: TopRunnerRow[];
    d30: TopRunnerRow[];
}

/**
 * The community below the records: who actually puts the hours in, with a
 * period toggle. Ranked by playtime — the one metric the record wall above
 * says nothing about. Renders nothing when the game has no runner data at
 * all (the wall's own empty state covers that page).
 */
export function TopRunners({ allTime, d90, d30 }: Props) {
    const [period, setPeriod] = useState<PeriodKey>('all');
    if (allTime.length === 0 && d90.length === 0 && d30.length === 0) {
        return null;
    }
    const rows = period === 'all' ? allTime : period === 'd90' ? d90 : d30;

    return (
        <section className={styles.section}>
            <div className={styles.runnersHead}>
                <span className={styles.sectionLabel}>
                    Top runners
                    <span className={styles.sectionCount}>{rows.length}</span>
                </span>
                <div
                    className={styles.runnersPeriods}
                    role="group"
                    aria-label="Top runners period"
                >
                    {PERIODS.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            className={
                                period === p.key
                                    ? styles.periodPillActive
                                    : styles.periodPill
                            }
                            aria-pressed={period === p.key}
                            onClick={() => setPeriod(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>
            {rows.length === 0 ? (
                <p className={styles.runnersEmpty}>
                    No recorded activity in this period.
                </p>
            ) : (
                <div className={styles.runnersTable}>
                    <div
                        className={`${styles.runnersRow} ${styles.runnersHeadRow}`}
                        aria-hidden
                    >
                        <span />
                        <span>Runner</span>
                        <span className={styles.runnersNum}>Hours</span>
                        <span className={styles.runnersNum}>Attempts</span>
                        <span className={styles.runnersNum}>PBs</span>
                    </div>
                    {rows.map((r, i) => (
                        <div key={r.username} className={styles.runnersRow}>
                            <span
                                className={`${styles.runnersRank} ${
                                    i === 0
                                        ? styles.rankGoldNum
                                        : i === 1
                                          ? styles.rankSilver
                                          : i === 2
                                            ? styles.rankBronze
                                            : ''
                                }`}
                            >
                                {i + 1}
                            </span>
                            <span className={styles.runnersName}>
                                <UserLink
                                    username={r.username}
                                    url={undefined}
                                />
                            </span>
                            <span className={styles.runnersNum}>
                                {formatHours(r.playtime)}
                            </span>
                            <span className={styles.runnersNum}>
                                {formatCount(r.attempts)}
                            </span>
                            <span className={styles.runnersNum}>
                                {r.pbs > 0 ? formatCount(r.pbs) : '—'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
