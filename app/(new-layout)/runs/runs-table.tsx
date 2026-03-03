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
    hideGameImage?: boolean;
    useGameTime?: boolean;
    hasCategory?: boolean;
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

function toggleSort(sort: string, field: string, defaultAsc?: boolean): string {
    const dir = getSortDirection(sort, field);
    if (dir === null) return defaultAsc ? field : `-${field}`;
    if (dir === 'asc') return `-${field}`;
    return field;
}

export function RunsTable({
    runs,
    isLoading,
    sort,
    onSortChange,
    onClearFilters,
    hideGameImage,
    useGameTime,
    hasCategory,
}: RunsTableProps) {
    const isInitialLoad = runs === null;
    const timeField = useGameTime ? 'game_time' : 'time';
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
                    <col className={`${styles.colDate} ${styles.hideMobile}`} />
                    <col className={`${styles.colPb} ${styles.hideXs}`} />
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
                        {hasCategory ? (
                            <SortableHeader
                                label="Time"
                                field={timeField}
                                sort={sort}
                                onSortChange={onSortChange}
                                align="right"
                                defaultAsc
                            />
                        ) : (
                            <th className={`${styles.th} ${styles.thRight}`}>
                                Time
                            </th>
                        )}
                        <SortableHeader
                            label="Date"
                            field="ended_at"
                            sort={sort}
                            onSortChange={onSortChange}
                            align="right"
                            className={styles.hideMobile}
                        />
                        <th
                            className={`${styles.th} ${styles.thCenter} ${styles.hideXs}`}
                        >
                            PB
                        </th>
                    </tr>
                </thead>

                <tbody className={isLoading ? styles.dimmed : undefined}>
                    {isInitialLoad && <SkeletonRows />}
                    {!isInitialLoad &&
                        !isEmpty &&
                        runs.map((run) => (
                            <RunRow
                                key={run.id}
                                run={run}
                                hideGameImage={hideGameImage}
                            />
                        ))}
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
    className,
    defaultAsc,
}: {
    label: string;
    field: string;
    sort: string;
    onSortChange: (sort: string) => void;
    align: 'left' | 'right';
    className?: string;
    defaultAsc?: boolean;
}) {
    const dir = getSortDirection(sort, field);
    const isActive = dir !== null;
    const alignClass = align === 'right' ? styles.thRight : styles.thLeft;

    return (
        <th
            className={`${styles.th} ${alignClass} ${styles.thSortable} ${isActive ? styles.thSortActive : ''} ${className ?? ''}`}
            onClick={() => onSortChange(toggleSort(sort, field, defaultAsc))}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSortChange(toggleSort(sort, field, defaultAsc));
                }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Sort by ${label}`}
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

function RunRow({
    run,
    hideGameImage,
}: {
    run: FinishedRunPB;
    hideGameImage?: boolean;
}) {
    return (
        <tr className={styles.row}>
            <td className={`${styles.td} ${styles.tdLeft}`}>
                <Link href={`/${run.username}`} className={styles.runnerLink}>
                    {run.userPicture && (
                        <img
                            src={run.userPicture}
                            alt=""
                            className={styles.userAvatar}
                        />
                    )}
                    {run.username}
                </Link>
            </td>
            <td
                className={`${styles.td} ${styles.tdLeft} ${styles.tdGame}`}
                title={run.game}
            >
                <span className={styles.gameCell}>
                    {!hideGameImage &&
                        (() => {
                            const hasImage =
                                run.gameImage && run.gameImage !== 'noimage';
                            const src = hasImage
                                ? run.gameImage!
                                : '/logo_dark_theme_no_text_transparent.png';
                            return (
                                <img
                                    src={src}
                                    alt=""
                                    className={
                                        hasImage
                                            ? styles.gameThumb
                                            : styles.gameThumbFallback
                                    }
                                />
                            );
                        })()}
                    <span className={styles.gameName}>
                        {run.game}
                        <span className={styles.categoryInline}>
                            {run.category}
                        </span>
                    </span>
                </span>
            </td>
            <td
                className={`${styles.td} ${styles.tdLeft} ${styles.hideMobile}`}
                title={run.category}
            >
                {run.category}
            </td>
            <td className={`${styles.td} ${styles.tdTime}`}>
                <span>
                    <DurationToFormatted duration={run.gameTime ?? run.time} />
                    {run.gameTime != null && (
                        <span className={styles.timeLabel}> IGT</span>
                    )}
                </span>
                {run.gameTime != null && (
                    <span className={styles.secondaryTime}>
                        <DurationToFormatted duration={run.time} /> RTA
                    </span>
                )}
            </td>
            <td
                className={`${styles.td} ${styles.tdRight} ${styles.hideMobile}`}
            >
                <span
                    className={styles.dateText}
                    title={new Date(run.endedAt).toLocaleString()}
                >
                    {timeAgo(run.endedAt)}
                </span>
            </td>
            <td className={`${styles.td} ${styles.tdCenter} ${styles.hideXs}`}>
                {run.isPb && (
                    <span className={styles.pbCell}>
                        <FiCheck className={styles.pbCheck} />
                        {run.previousPb != null && (
                            <span className={styles.pbDelta}>
                                -
                                <DurationToFormatted
                                    duration={run.previousPb - run.time}
                                />
                            </span>
                        )}
                    </span>
                )}
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
                    <td
                        className={`${styles.skeletonCell} ${styles.hideMobile}`}
                    >
                        <div
                            className={`${styles.skeletonBar} ${styles.skeletonBarNarrow}`}
                        />
                    </td>
                    <td className={`${styles.skeletonCell} ${styles.hideXs}`}>
                        <div
                            className={`${styles.skeletonBar} ${styles.skeletonBarTiny}`}
                        />
                    </td>
                </tr>
            ))}
        </>
    );
}
