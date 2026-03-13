'use client';

import React from 'react';
import { DurationToFormatted } from '~src/components/util/datetime';
import styles from './data.module.scss';
import type { EntityTab, Metric } from './types';
import { isAggregatedTab } from './types';

const DURATION_COLUMNS = new Set([
    'personalBest',
    'sumOfBests',
    'totalRunTime',
    'time',
    'gameTime',
    'gameTimePb',
    'gameTimeSob',
    'personalBestTime',
]);

const DURATION_METRICS: Metric[] = ['playtime'];

const METRIC_LABELS: Record<Metric, string> = {
    playtime: 'Total Playtime',
    attempts: 'Total Attempts',
    'finished-attempts': 'Finished Attempts',
    'runner-count': 'Runner Count',
};

interface ResultsTableProps {
    data: any;
    isLoading: boolean;
    error: any;
    tab: EntityTab;
    metric: Metric;
    apiUrl: string;
}

export function ResultsTable({
    data,
    isLoading,
    error,
    tab,
    metric,
    apiUrl,
}: ResultsTableProps) {
    if (!apiUrl) {
        return (
            <div className={styles.emptyState}>
                <p>Pick a preset above, or set your filters and hit Search.</p>
            </div>
        );
    }

    if (isLoading) {
        return <SkeletonTable rows={8} cols={isAggregatedTab(tab) ? 3 : 6} />;
    }

    if (error) {
        return <div className={styles.alertDanger}>Failed to fetch data.</div>;
    }

    if (!data) return null;

    const result = data.result ?? data;

    // Single count result (count aggregate without group_by)
    if (
        result &&
        typeof result === 'object' &&
        'count' in result &&
        !Array.isArray(result)
    ) {
        return (
            <div className={styles.countResult}>
                <div className={styles.countLabel}>Count</div>
                <div className={styles.countValue}>
                    {Number(result.count).toLocaleString()}
                </div>
            </div>
        );
    }

    const rows = Array.isArray(result) ? result : [];
    if (rows.length === 0) {
        return (
            <div className={styles.alertSecondary}>
                No results found. Try adjusting your filters.
            </div>
        );
    }

    if (isAggregatedTab(tab)) {
        return <AggregateResults rows={rows} tab={tab} metric={metric} />;
    }

    return <RawResults rows={rows} tab={tab} />;
}

function AggregateResults({
    rows,
    tab,
    metric,
}: {
    rows: any[];
    tab: EntityTab;
    metric: Metric;
}) {
    const entityLabel =
        tab === 'games' ? 'Game' : tab === 'categories' ? 'Category' : 'User';
    const isDuration = DURATION_METRICS.includes(metric);

    const groupKey =
        tab === 'games'
            ? 'game'
            : tab === 'categories'
              ? 'category'
              : 'username';

    return (
        <div>
            <div className={styles.resultCount}>
                {rows.length} result{rows.length !== 1 ? 's' : ''}
            </div>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead className={styles.tableHead}>
                        <tr>
                            <th style={{ width: '3rem' }}>#</th>
                            <th>{entityLabel}</th>
                            {tab === 'categories' && <th>Game</th>}
                            <th style={{ width: '12rem', textAlign: 'right' }}>
                                {METRIC_LABELS[metric]}
                            </th>
                        </tr>
                    </thead>
                    <tbody className={styles.tableBody}>
                        {rows.map((row: any, i: number) => (
                            <tr key={i}>
                                <td className={styles.rankCell}>{i + 1}</td>
                                <td className={styles.entityCell}>
                                    {row[groupKey] ?? row.key ?? '-'}
                                </td>
                                {tab === 'categories' && (
                                    <td
                                        style={{
                                            color: 'var(--bs-secondary-color)',
                                        }}
                                    >
                                        {row.game ?? '-'}
                                    </td>
                                )}
                                <td className={styles.numericCell}>
                                    {isDuration && row.value > 0 ? (
                                        <DurationToFormatted
                                            duration={row.value}
                                        />
                                    ) : (
                                        Number(row.value).toLocaleString()
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RawResults({ rows, tab }: { rows: any[]; tab: EntityTab }) {
    const columns = Object.keys(rows[0]);

    return (
        <div>
            <div className={styles.resultCount}>
                {rows.length} result{rows.length !== 1 ? 's' : ''}
            </div>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead className={styles.tableHead}>
                        <tr>
                            <th style={{ width: '3rem' }}>#</th>
                            {columns.map((col) => (
                                <th key={col}>{formatColumnHeader(col)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={styles.tableBody}>
                        {rows.map((row: any, i: number) => (
                            <tr key={i}>
                                <td className={styles.rankCell}>{i + 1}</td>
                                {columns.map((col) => (
                                    <td key={col}>
                                        {formatCell(col, row[col], tab)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SkeletonTable({ rows, cols }: { rows: number; cols: number }) {
    return (
        <div className={`${styles.tableWrapper} ${styles.skeleton}`}>
            <table className={styles.table}>
                <thead className={styles.tableHead}>
                    <tr>
                        {Array.from({ length: cols }).map((_, i) => (
                            <th key={i}>
                                <div
                                    className="placeholder-glow"
                                    style={{
                                        width: i === 0 ? '2rem' : '6rem',
                                    }}
                                >
                                    <span className="placeholder col-12 rounded" />
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className={styles.tableBody}>
                    {Array.from({ length: rows }).map((_, rowIdx) => (
                        <tr key={rowIdx}>
                            {Array.from({ length: cols }).map((_, colIdx) => (
                                <td key={colIdx}>
                                    <div className="placeholder-glow">
                                        <span
                                            className="placeholder rounded"
                                            style={{
                                                width: `${40 + ((rowIdx * 7 + colIdx * 13) % 40)}%`,
                                            }}
                                        />
                                    </div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function formatColumnHeader(key: string): string {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase())
        .trim();
}

function formatCell(
    column: string,
    value: unknown,
    _tab: EntityTab,
): React.ReactNode {
    if (value === null || value === undefined) return '-';

    // Duration columns
    if (
        typeof value === 'number' &&
        DURATION_COLUMNS.has(column) &&
        value > 0
    ) {
        return <DurationToFormatted duration={value} />;
    }

    // PB badge
    if (column === 'isPb' || column === 'is_pb') {
        return value ? <span className={styles.badgeSuccess}>PB</span> : null;
    }

    // Booleans
    if (typeof value === 'boolean') {
        return value ? (
            <span className={styles.badgeSuccess}>Yes</span>
        ) : (
            <span className={styles.badgeSecondary}>No</span>
        );
    }

    // ISO dates -- relative time with full date on hover
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        const date = new Date(value);
        const relative = getRelativeTime(date);
        return <abbr title={date.toLocaleString()}>{relative}</abbr>;
    }

    // Numbers
    if (typeof value === 'number') return value.toLocaleString();

    return String(value);
}

function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
