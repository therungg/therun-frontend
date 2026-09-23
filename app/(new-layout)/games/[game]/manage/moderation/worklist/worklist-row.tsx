'use client';

import { DurationToFormatted } from '~src/components/util/datetime';
import { RowRoster } from '../shared/row-roster';
import { type QueueRowView, waitingLabel } from './worklist-model';
import styles from './worklist-pane.module.scss';

const MEDAL: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

/** One queue row. The whole row opens the run for review. */
export function WorklistRow({
    row,
    now,
    focused = false,
    onOpen,
}: {
    row: QueueRowView;
    now: Date;
    /** The keyboard is on this row. */
    focused?: boolean;
    onOpen: (row: QueueRowView) => void;
}) {
    return (
        <li className={styles.queueItem}>
            <button
                type="button"
                className={styles.queueRow}
                data-queue-key={row.key}
                data-focused={focused || undefined}
                onClick={() => onOpen(row)}
                aria-label={`Open ${row.runnerName}'s run on ${row.board}`}
            >
                <span
                    className={styles.rank}
                    data-medal={row.rank != null ? MEDAL[row.rank] : undefined}
                >
                    {row.rank ?? ''}
                </span>
                <span className={styles.runner}>
                    <span className={styles.queueRunner}>
                        {row.runnerName}
                        {row.isGuest && (
                            <span className={styles.guest}>guest</span>
                        )}
                    </span>
                    <RowRoster
                        participants={row.participants}
                        filer={row}
                        links={false}
                    />
                    <span className={styles.boardLine}>{row.board}</span>
                </span>
                <span className={styles.rowTime}>
                    <DurationToFormatted duration={row.timeMs} />
                </span>
                {row.delta === null || row.delta === 'first' ? (
                    <span className={styles.delta} data-none>
                        {row.delta ?? ''}
                    </span>
                ) : (
                    <span
                        className={styles.delta}
                        data-faster={row.delta.faster || undefined}
                        title={row.delta.title ?? undefined}
                    >
                        {row.delta.text}
                    </span>
                )}
                <span
                    className={styles.why}
                    data-tone={row.why.tone}
                    title={row.why.text}
                >
                    {row.why.text}
                </span>
                <span className={styles.video}>{row.video}</span>
                <span className={styles.wait} suppressHydrationWarning>
                    {waitingLabel(row.waitingSince, now)}
                </span>
            </button>
        </li>
    );
}
