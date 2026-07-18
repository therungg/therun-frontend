'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'react-bootstrap-icons';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type { WrHistoryEntry } from '../../../../../types/leaderboards.types';
import { relativeDate } from '../leaderboard/relative-date';
import { BoardDialog } from '../shared/board-dialog';
import styles from './wr-history-drawer.module.scss';
import {
    formatDeltaSeconds,
    formatHeldDuration,
    toWrHistoryRows,
    type WrHistoryRow,
} from './wr-history-model';

interface Props {
    show: boolean;
    onHide: () => void;
    gameSlug: string;
    categorySlug: string;
    categoryDisplay: string;
    subcategoryKey: string;
    /** category.showMilliseconds ?? true — precision the board is configured for. */
    showMilliseconds?: boolean;
}

const SKELETON_ROWS = 5;

export function WrHistoryDrawer({
    show,
    onHide,
    gameSlug,
    categorySlug,
    categoryDisplay,
    subcategoryKey,
    showMilliseconds = true,
}: Props) {
    const [history, setHistory] = useState<WrHistoryEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!show) return;
        let cancelled = false;
        setHistory(null);
        setError(null);
        const url = `${process.env.NEXT_PUBLIC_DATA_URL}/v1/leaderboards/wr-history/${encodeURIComponent(gameSlug)}/${encodeURIComponent(categorySlug)}?subcategory=${encodeURIComponent(subcategoryKey)}`;
        fetch(url)
            .then((r) => {
                if (!r.ok) throw new Error(`${r.status}`);
                return r.json();
            })
            .then((j) => {
                if (cancelled) return;
                setHistory(j.result ?? []);
            })
            .catch((e) => {
                if (cancelled) return;
                setError(e.message ?? 'Failed to load');
            });
        return () => {
            cancelled = true;
        };
    }, [show, gameSlug, categorySlug, subcategoryKey]);

    const rows = history ? toWrHistoryRows(history) : null;

    return (
        <BoardDialog
            open={show}
            onClose={onHide}
            labelledBy="wr-history-title"
            size="lg"
        >
            <div className={styles.header}>
                <h5 className={styles.title} id="wr-history-title">
                    World record history — {categoryDisplay}
                </h5>
                <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={onHide}
                />
            </div>
            <div className={styles.body}>
                {error && (
                    <div className={styles.errorAlert} role="alert">
                        Failed to load WR history: {error}
                    </div>
                )}
                {!error && rows === null && (
                    <ul className={styles.list} aria-hidden="true">
                        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                            <li key={i} className={styles.skeletonRow}>
                                <span
                                    className={`${styles.skeletonBar} ${styles.skeletonName}`}
                                />
                                <span
                                    className={`${styles.skeletonBar} ${styles.skeletonTime}`}
                                />
                                <span
                                    className={`${styles.skeletonBar} ${styles.skeletonMeta}`}
                                />
                            </li>
                        ))}
                    </ul>
                )}
                {!error && rows !== null && rows.length === 0 && (
                    <div className={styles.empty}>
                        <Trophy
                            size={28}
                            className={styles.emptyIcon}
                            aria-hidden
                        />
                        <p className={styles.emptyTitle}>
                            No world record history yet.
                        </p>
                    </div>
                )}
                {!error && rows !== null && rows.length > 0 && (
                    <ul className={styles.list}>
                        {rows.map((row) => (
                            <WrHistoryListItem
                                key={row.key}
                                row={row}
                                showMilliseconds={showMilliseconds}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </BoardDialog>
    );
}

function WrHistoryListItem({
    row,
    showMilliseconds,
}: {
    row: WrHistoryRow;
    showMilliseconds: boolean;
}) {
    const deltaClass =
        row.deltaMs == null
            ? styles.deltaNeutral
            : row.deltaMs > 0
              ? styles.deltaRegression
              : styles.deltaImprovement;

    return (
        <li
            className={`${styles.row} ${row.isCurrent ? styles.rowCurrent : ''}`}
        >
            <div className={styles.rowTop}>
                <span className={styles.runner}>{row.runnerName}</span>
                {row.isCurrent && (
                    <span className={styles.currentPill}>Current</span>
                )}
            </div>
            <div className={styles.rowTimeLine}>
                <span className={styles.time}>
                    <DurationToFormatted
                        duration={row.time}
                        withMillis={showMilliseconds}
                    />
                </span>
                <span className={`${styles.delta} ${deltaClass}`}>
                    {formatDeltaSeconds(row.deltaMs)}
                </span>
            </div>
            <div className={styles.held}>
                Held for {formatHeldDuration(row.heldMs)}
                {row.isCurrent && ' — and counting'}
            </div>
            <div className={styles.when} title={formatRunDate(row.setAt)}>
                {relativeDate(row.setAt)}
            </div>
        </li>
    );
}
