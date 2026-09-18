import moment from 'moment';
import { describeEvent } from '~src/lib/run-view/describe-event';
import type { HistoryEvent } from '../../../../../types/moderation.types';
import styles from './run-page.module.scss';

export function RunHistoryList({ events }: { events: HistoryEvent[] }) {
    if (events.length === 0) return null;

    return (
        <ul className={styles.historyList}>
            {events.map((e, i) => (
                <li key={`${e.at}-${i}`}>
                    <span>{describeEvent(e)}</span>
                    <span className={styles.muted}>
                        {' '}
                        · {e.byRole} · {moment(e.at).fromNow()}
                    </span>
                    {e.reason && (
                        <div className={styles.historyReason}>“{e.reason}”</div>
                    )}
                </li>
            ))}
        </ul>
    );
}
