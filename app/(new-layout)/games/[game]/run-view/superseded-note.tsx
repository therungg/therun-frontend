import Link from '~src/components/link';
import { buildBoardEntryHref } from '~src/lib/board-url';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

/** The runner's board entry on this run's board, when it is another run. */
export function currentEntryOf(model: RunViewModel) {
    if (model.kind !== 'run' || model.boardContext != null) return null;
    if (model.verificationStatus === 'rejected') return null;
    return (
        model.runnerEntries.find(
            (e) =>
                e.categoryId === model.categoryId &&
                e.subcategoryKey === model.subcategoryKey &&
                !(e.source === 'run' && e.runId === model.id),
        ) ?? null
    );
}

/** "Current PB" pointer for a run that isn't the runner's board entry anymore. */
export function SupersededNote({ model }: { model: RunViewModel }) {
    const current = currentEntryOf(model);
    if (!current) return null;
    const href = buildBoardEntryHref(model.game.name, current);
    const body = (
        <>
            Current PB <strong>{formatTimeMs(current.timeMs)}</strong>
            {current.rank != null && ` · #${current.rank}`}
        </>
    );
    return (
        <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Leaderboard</h2>
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
