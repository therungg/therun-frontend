import Link from '~src/components/link';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

/** "Current PB" pointer for a run that isn't the runner's board entry anymore. */
export function SupersededNote({ model }: { model: RunViewModel }) {
    if (model.kind !== 'run' || model.boardContext != null) return null;
    if (model.verificationStatus === 'rejected') return null;
    const current = model.runnerEntries.find(
        (e) =>
            e.categoryId === model.categoryId &&
            e.subcategoryKey === model.subcategoryKey &&
            !(e.source === 'run' && e.runId === model.id),
    );
    if (!current) return null;
    const href =
        current.source === 'run' && current.runId != null
            ? `/games-v2/${encodeURIComponent(model.game.name)}/run/${current.runId}`
            : current.manualTimeId != null
              ? `/games-v2/${encodeURIComponent(model.game.name)}/manual/${current.manualTimeId}`
              : null;
    const body = (
        <>
            Current PB <strong>{formatTimeMs(current.timeMs)}</strong>
            {current.rank != null && ` · #${current.rank}`}
        </>
    );
    return (
        <section className={styles.panel}>
            <h2 className={styles.panelTitle}>On the board</h2>
            {href ? (
                <Link href={href} className={styles.superseded}>
                    {body} →
                </Link>
            ) : (
                <div className={styles.superseded}>{body}</div>
            )}
        </section>
    );
}
