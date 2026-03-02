'use client';

import Link from 'next/link';
import { FiCheck, FiClock } from 'react-icons/fi';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { FinishedRunPB } from '~src/lib/highlights';
import styles from './runs-table.module.scss';

interface RunsTableProps {
    runs: FinishedRunPB[] | null;
    isLoading: boolean;
    sort: string;
    onSortChange: (sort: string) => void;
    onClearFilters: () => void;
}

function timeAgo(dateString: string): string {
    const seconds = Math.floor(
        (Date.now() - new Date(dateString).getTime()) / 1000,
    );
    const intervals = [
        { label: 'y', seconds: 31536000 },
        { label: 'mo', seconds: 2592000 },
        { label: 'd', seconds: 86400 },
        { label: 'h', seconds: 3600 },
        { label: 'm', seconds: 60 },
    ];
    for (const { label, seconds: s } of intervals) {
        const count = Math.floor(seconds / s);
        if (count >= 1) return `${count}${label} ago`;
    }
    return 'just now';
}

function getSortDirection(sort: string, field: string): 'asc' | 'desc' | null {
    if (sort === field) return 'asc';
    if (sort === `-${field}`) return 'desc';
    return null;
}

function toggleSort(sort: string, field: string): string {
    const dir = getSortDirection(sort, field);
    if (dir === 'desc') return field;
    return `-${field}`;
}

export function RunsTable({
    runs,
    isLoading,
    sort,
    onSortChange,
    onClearFilters,
}: RunsTableProps) {
    const isInitialLoad = runs === null;
    const isEmpty = runs !== null && runs.length === 0 && !isLoading;

    return (
        <div className={styles.tableWrapper}>
            {isLoading && !isInitialLoad && (
                <div className={styles.loadingBar} />
            )}

            <table className={styles.table}>
                <colgroup>
                    <col className={styles.colRunner} />
                    <col className={styles.colGame} />
                    <col
                        className={`${styles.colCategory} ${styles.hideMobile}`}
                    />
                    <col className={styles.colTime} />
                    <col className={styles.colDate} />
                    <col className={styles.colPb} />
                </colgroup>

                <thead className={styles.thead}>
                    <tr>
                        <th className={`${styles.th} ${styles.thLeft}`}>
                            Runner
                        </th>
                        <th className={`${styles.th} ${styles.thLeft}`}>
                            Game
                        </th>
                        <th
                            className={`${styles.th} ${styles.thLeft} ${styles.hideMobile}`}
                        >
                            Category
                        </th>
                        <SortableHeader
                            label="Time"
                            field="time"
                            sort={sort}
                            onSortChange={onSortChange}
                            align="right"
                        />
                        <SortableHeader
                            label="Date"
                            field="ended_at"
                            sort={sort}
                            onSortChange={onSortChange}
                            align="right"
                        />
                        <th className={`${styles.th} ${styles.thCenter}`}>
                            PB
                        </th>
                    </tr>
                </thead>

                <tbody className={isLoading ? styles.dimmed : undefined}>
                    {isInitialLoad && <SkeletonRows />}
                    {!isInitialLoad &&
                        !isEmpty &&
                        runs.map((run) => <RunRow key={run.id} run={run} />)}
                </tbody>
            </table>

            {isEmpty && (
                <div className={styles.emptyState}>
                    <FiClock className={styles.emptyIcon} />
                    <p className={styles.emptyTitle}>
                        No runs match your filters
                    </p>
                    <p className={styles.emptySubtitle}>
                        Try broadening your search or clearing filters
                    </p>
                    <button
                        type="button"
                        className={styles.clearButton}
                        onClick={onClearFilters}
                    >
                        Clear filters
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Sortable header ──

function SortableHeader({
    label,
    field,
    sort,
    onSortChange,
    align,
}: {
    label: string;
    field: string;
    sort: string;
    onSortChange: (sort: string) => void;
    align: 'left' | 'right';
}) {
    const dir = getSortDirection(sort, field);
    const isActive = dir !== null;
    const alignClass = align === 'right' ? styles.thRight : styles.thLeft;

    return (
        <th
            className={`${styles.th} ${alignClass} ${styles.thSortable} ${isActive ? styles.thSortActive : ''}`}
            onClick={() => onSortChange(toggleSort(sort, field))}
        >
            {label}
            {isActive && (
                <span className={styles.sortArrow}>
                    {dir === 'asc' ? '▲' : '▼'}
                </span>
            )}
        </th>
    );
}

// ── Data row ──

function RunRow({ run }: { run: FinishedRunPB }) {
    return (
        <tr className={styles.row}>
            <td className={`${styles.td} ${styles.tdLeft}`}>
                <Link href={`/${run.username}`} className={styles.runnerLink}>
                    {run.username}
                </Link>
            </td>
            <td className={`${styles.td} ${styles.tdLeft}`} title={run.game}>
                {run.game}
            </td>
            <td
                className={`${styles.td} ${styles.tdLeft} ${styles.hideMobile}`}
                title={run.category}
            >
                {run.category}
            </td>
            <td className={`${styles.td} ${styles.tdTime}`}>
                <DurationToFormatted duration={run.time} />
            </td>
            <td className={`${styles.td} ${styles.tdRight}`}>
                <span
                    className={styles.dateText}
                    title={new Date(run.endedAt).toLocaleString()}
                >
                    {timeAgo(run.endedAt)}
                </span>
            </td>
            <td className={`${styles.td} ${styles.tdCenter}`}>
                {run.isPb && <FiCheck className={styles.pbCheck} />}
            </td>
        </tr>
    );
}

// ── Skeleton rows ──

function SkeletonRows() {
    return (
        <>
            {Array.from({ length: 10 }, (_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                    <td className={styles.skeletonCell}>
                        <div
                            className={`${styles.skeletonBar} ${styles.skeletonBarShort}`}
                        />
                    </td>
                    <td className={styles.skeletonCell}>
                        <div
                            className={`${styles.skeletonBar} ${styles.skeletonBarFull}`}
                        />
                    </td>
                    <td
                        className={`${styles.skeletonCell} ${styles.hideMobile}`}
                    >
                        <div
                            className={`${styles.skeletonBar} ${styles.skeletonBarMedium}`}
                        />
                    </td>
                    <td className={styles.skeletonCell}>
                        <div
                            className={`${styles.skeletonBar} ${styles.skeletonBarNarrow}`}
                        />
                    </td>
                    <td className={styles.skeletonCell}>
                        <div
                            className={`${styles.skeletonBar} ${styles.skeletonBarNarrow}`}
                        />
                    </td>
                    <td className={styles.skeletonCell}>
                        <div
                            className={`${styles.skeletonBar} ${styles.skeletonBarTiny}`}
                        />
                    </td>
                </tr>
            ))}
        </>
    );
}
