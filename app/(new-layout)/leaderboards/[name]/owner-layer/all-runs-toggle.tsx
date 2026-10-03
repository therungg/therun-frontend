'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { loadRunnerCategoryRunsAction } from '~src/actions/pb-submission.action';
import type { SubmissionItem } from '../../../../../types/runner-status.types';
import profileStyles from '../leaderboards-profile.module.scss';
import { OwnerItemRow } from './off-board-rows';
import styles from './owner-layer.module.scss';
import { useOwnerLayer } from './owner-layer-provider';
import type { ItemBoard } from './row-status';

export interface Slice {
    categoryId: number;
    subcategoryKey: string;
}

/**
 * Every finished run on one board slice, fifty at a time, newest first.
 * Reloads from the start whenever the page's overview does, so a change made
 * from one of its rows shows up here too.
 */
/** The board entry the list sits under: left out of it, and timed against. */
export interface EntryRef {
    kind: 'run';
    id: number;
    timeMs: number;
}

export function OwnerRunsList({
    slice,
    board,
    entry,
    pbIds,
}: {
    slice: Slice;
    board: ItemBoard;
    entry: EntryRef;
    /** Runs that were PBs, tagged as such. */
    pbIds: Set<number>;
}) {
    const { runnerName, version } = useOwnerLayer();
    const [items, setItems] = useState<SubmissionItem[] | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [failedPage, setFailedPage] = useState(0);
    const [loading, startLoading] = useTransition();
    // Only the latest request may land: a reload from page 0 overtakes a
    // "Show more" still in flight.
    const latest = useRef(0);

    const load = (next: number) => {
        setError(null);
        const request = ++latest.current;
        startLoading(async () => {
            const res = await loadRunnerCategoryRunsAction(
                runnerName,
                slice.categoryId,
                slice.subcategoryKey,
                next,
            );
            if (request !== latest.current) return;
            if ('error' in res) {
                setError(res.error);
                setFailedPage(next);
                return;
            }
            setItems((prev) =>
                next === 0 ? res.items : [...(prev ?? []), ...res.items],
            );
            setPage(res.page);
            setHasMore(res.hasMore);
        });
    };

    // `version` is in the list on purpose: a fresh overview reloads page 0.
    useEffect(() => {
        load(0);
    }, [version, runnerName, slice.categoryId, slice.subcategoryKey]);

    return (
        <>
            {items
                ?.filter((i) => !(i.kind === entry.kind && i.id === entry.id))
                .map((item) => (
                    <OwnerItemRow
                        key={`${item.kind}-${item.id}`}
                        item={item}
                        board={board}
                        compareMs={entry.timeMs}
                        pb={pbIds.has(item.id)}
                    />
                ))}
            {items !== null && items.length === 0 && !error ? (
                <div className={styles.historyNote}>No finished runs.</div>
            ) : null}
            {error ? (
                <div className={styles.historyNote}>
                    <span className={styles.error}>{error}</span>{' '}
                    <button
                        type="button"
                        className={profileStyles.tab}
                        disabled={loading}
                        onClick={() => load(failedPage)}
                    >
                        Try again
                    </button>
                </div>
            ) : null}
            {items === null && loading ? (
                <div className={styles.historyNote}>Loading…</div>
            ) : null}
            {hasMore && items !== null ? (
                <button
                    type="button"
                    className={`${profileStyles.tab} ${styles.historyMore}`}
                    disabled={loading}
                    onClick={() => load(page + 1)}
                >
                    {loading ? 'Loading…' : 'Show more'}
                </button>
            ) : null}
        </>
    );
}
