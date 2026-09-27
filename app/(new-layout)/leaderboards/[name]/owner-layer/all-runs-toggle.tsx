'use client';

import {
    type ReactNode,
    useEffect,
    useId,
    useRef,
    useState,
    useTransition,
} from 'react';
import { loadRunnerCategoryRunsAction } from '~src/actions/pb-submission.action';
import type { SubmissionItem } from '../../../../../types/runner-status.types';
import profileStyles from '../leaderboards-profile.module.scss';
import { OwnerItemRow } from './off-board-rows';
import styles from './owner-layer.module.scss';
import { useOwnerLayer } from './owner-layer-provider';
import type { ItemBoard } from './row-status';

interface Slice {
    categoryId: number;
    subcategoryKey: string;
}

/**
 * Every finished run on one board slice, fifty at a time, newest first.
 * Reloads from the start whenever the page's overview does, so a change made
 * from one of its rows shows up here too.
 */
function AllRunsList({
    id,
    slice,
    board,
}: {
    id: string;
    slice: Slice;
    board: ItemBoard;
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
        <div id={id} className={styles.history}>
            {items?.map((item) => (
                <OwnerItemRow
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    board={board}
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
        </div>
    );
}

/**
 * "All finished runs" for one board slice: a text toggle for the row's name
 * cell and the list it opens under the row. Only the layer's viewers get it.
 */
export function useAllRuns(
    slice: Slice,
    board: ItemBoard | null,
): { toggle: ReactNode; list: ReactNode } {
    const { overview, canSee } = useOwnerLayer();
    const [open, setOpen] = useState(false);
    const listId = useId();
    if (!overview || !board || !canSee(board.gameId)) {
        return { toggle: null, list: null };
    }
    return {
        toggle: (
            <button
                type="button"
                className={profileStyles.earlierToggle}
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpen((v) => !v)}
            >
                All finished runs
            </button>
        ),
        list: open ? (
            <AllRunsList id={listId} slice={slice} board={board} />
        ) : null,
    };
}
