'use client';

import Link from '~src/components/link';
import type {
    CategoryReassignment,
    GameReassignment,
} from '../../../../../../types/reassignments.types';
import styles from './reassignments.module.scss';
import { useReassignmentStatus } from './use-reassignment-status';

interface Props<T extends GameReassignment | CategoryReassignment> {
    id: number;
    fetcher: (id: number) => Promise<T>;
    targetGameSlug?: string;
    onUndo?: () => void;
    onRestart?: () => void;
}

const BADGE_CLASS: Record<string, string> = {
    pending: styles.badgePending,
    running: styles.badgeRunning,
    undoing: styles.badgeRunning,
    completed: styles.badgeDone,
    undone: styles.badgeDone,
    failed: styles.badgeFailed,
};

export function ReassignmentStatus<
    T extends GameReassignment | CategoryReassignment,
>({ id, fetcher, targetGameSlug, onUndo, onRestart }: Props<T>) {
    const { data, error } = useReassignmentStatus<T>(id, fetcher);

    if (error && !data) {
        return (
            <div className={`${styles.callout} ${styles.calloutError}`}>
                Failed to load status: {error}
            </div>
        );
    }
    if (!data) {
        return (
            <div className={styles.statusLine}>
                <span className={styles.spinner} aria-hidden />
                <span className={styles.muted}>Loading status…</span>
            </div>
        );
    }

    const inFlight = data.status === 'pending' || data.status === 'running';

    return (
        <div>
            <div className={styles.statusLine}>
                {inFlight && <span className={styles.spinner} aria-hidden />}
                <span
                    className={`${styles.statusBadge} ${
                        BADGE_CLASS[data.status] ?? styles.badgePending
                    }`}
                >
                    {data.status}
                </span>
            </div>

            {data.status === 'completed' && (
                <>
                    <p className={styles.success}>
                        Done —{' '}
                        <span className={styles.statMoved}>
                            {data.runsMovedCount}
                        </span>{' '}
                        runs moved.
                    </p>
                    <div className={styles.actions}>
                        {targetGameSlug && (
                            <Link
                                href={`/games-v2/${targetGameSlug}`}
                                className={styles.link}
                            >
                                View target game ↗
                            </Link>
                        )}
                        <span className={styles.spacer} />
                        {onUndo && (
                            <button
                                type="button"
                                className={styles.btnGhost}
                                onClick={onUndo}
                            >
                                Undo
                            </button>
                        )}
                    </div>
                </>
            )}

            {data.status === 'failed' && (
                <>
                    <div className={`${styles.callout} ${styles.calloutError}`}>
                        {data.statusMessage ?? 'Merge failed.'}
                    </div>
                    {onRestart && (
                        <div className={styles.actions}>
                            <span className={styles.spacer} />
                            <button
                                type="button"
                                className={styles.btnGhost}
                                onClick={onRestart}
                            >
                                Restart
                            </button>
                        </div>
                    )}
                </>
            )}

            {inFlight && (
                <p className={styles.muted}>
                    Working… this may take a few seconds.
                </p>
            )}
        </div>
    );
}
