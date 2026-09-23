'use client';

import moment from 'moment';
import { describeEvent } from '~src/lib/run-view/describe-event';
import type { HistoryEvent } from '../../../../../../types/moderation.types';
import styles from './mod-layer.module.scss';

const BY: Record<HistoryEvent['byRole'], string> = {
    mod: 'moderator',
    self: 'runner',
    system: 'system',
};

/** What has happened to the run, oldest first. */
export function HistoryReview({ history }: { history: HistoryEvent[] }) {
    if (history.length === 0) return null;
    const events = [...history].sort(
        (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );

    return (
        <section className={styles.panel}>
            <div className={styles.head}>
                <span className={styles.eyebrow}>History</span>
            </div>
            <div className={styles.history}>
                {events.map((e, i) => (
                    <div key={`${e.at}-${i}`} className={styles.historyRow}>
                        <span className={styles.muted} suppressHydrationWarning>
                            {moment(e.at).fromNow()}
                        </span>
                        <span>
                            {describeEvent(e)}
                            <span className={styles.muted}>
                                {' '}
                                · {BY[e.byRole] ?? e.byRole}
                            </span>
                            {e.reason && (
                                <span className={styles.muted}>
                                    {' '}
                                    · “{e.reason}”
                                </span>
                            )}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
