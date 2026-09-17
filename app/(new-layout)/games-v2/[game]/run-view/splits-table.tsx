'use client';

import { formatTimeMs } from '~src/lib/run-view/time-format';
import type { RunSplit } from '../../../../../types/leaderboards.types';
import { useRunMedia } from './run-media';
import styles from './run-page.module.scss';

export function SplitsTable({
    splits,
    gameTimeLabel,
}: {
    splits: RunSplit[];
    gameTimeLabel: 'igt' | 'lrt';
}) {
    const { seekToSplit } = useRunMedia();
    if (splits.length === 0) return null;
    const hasGame = splits.some((s) => s.gameSplitTimeMs != null);

    return (
        <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Splits</h2>
            <table className={styles.splits}>
                <thead>
                    <tr>
                        <th>Segment</th>
                        <th>Time</th>
                        <th>Split</th>
                        {hasGame && <th>{gameTimeLabel.toUpperCase()}</th>}
                    </tr>
                </thead>
                <tbody>
                    {splits.map((s, i) => {
                        const seg =
                            s.splitTimeMs -
                            (i > 0 ? splits[i - 1].splitTimeMs : 0);
                        return (
                            <tr
                                key={s.index}
                                className={
                                    seekToSplit ? styles.seekable : undefined
                                }
                            >
                                <td>
                                    {seekToSplit ? (
                                        <button
                                            type="button"
                                            className={styles.linkButton}
                                            onClick={() => seekToSplit(s.index)}
                                        >
                                            {s.name}
                                        </button>
                                    ) : (
                                        s.name
                                    )}
                                </td>
                                <td>{formatTimeMs(seg)}</td>
                                <td>{formatTimeMs(s.splitTimeMs)}</td>
                                {hasGame && (
                                    <td>
                                        {s.gameSplitTimeMs != null
                                            ? formatTimeMs(s.gameSplitTimeMs)
                                            : ''}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
}
