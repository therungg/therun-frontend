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

export function ReassignmentStatus<
    T extends GameReassignment | CategoryReassignment,
>({ id, fetcher, targetGameSlug, onUndo, onRestart }: Props<T>) {
    const { data, error } = useReassignmentStatus<T>(id, fetcher);

    if (error && !data) {
        return <p className={styles.error}>Failed to load status: {error}</p>;
    }
    if (!data) {
        return <p className={styles.muted}>Loading status…</p>;
    }

    return (
        <div className={styles.step}>
            <p>
                Status: <strong>{data.status}</strong>
            </p>
            {data.status === 'completed' && (
                <>
                    <p className={styles.success}>
                        Done. {data.runsMovedCount} runs moved.
                    </p>
                    {targetGameSlug && (
                        <p>
                            <Link href={`/games-v2/${targetGameSlug}`}>
                                View target game ↗
                            </Link>
                        </p>
                    )}
                    {onUndo && (
                        <button type="button" onClick={onUndo}>
                            Undo
                        </button>
                    )}
                </>
            )}
            {data.status === 'failed' && (
                <>
                    <p className={styles.error}>
                        {data.statusMessage ?? 'Reassignment failed.'}
                    </p>
                    {onRestart && (
                        <button type="button" onClick={onRestart}>
                            Restart
                        </button>
                    )}
                </>
            )}
            {(data.status === 'pending' || data.status === 'running') && (
                <p className={styles.muted}>
                    Working… this may take a few seconds.
                </p>
            )}
        </div>
    );
}
