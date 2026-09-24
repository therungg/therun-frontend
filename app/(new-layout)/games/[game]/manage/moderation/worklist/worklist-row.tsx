'use client';

import { PlayFill } from 'react-bootstrap-icons';
import { DurationToFormatted } from '~src/components/util/datetime';
import { RunnerAvatar } from '../../../leaderboard/runner-avatar';
import { RowRoster } from '../shared/row-roster';
import { ageLabel, type QueueRowView } from './worklist-model';
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
            >
                <RunnerAvatar
                    name={row.runnerName}
                    picture={row.picture}
                    size="md"
                />
                <span className={styles.runner}>
                    <span className={styles.queueRunner}>
                        <span className={styles.queueRunnerName}>
                            {row.runnerName}
                        </span>
                        {row.isGuest && (
                            <span className={styles.guest}>guest</span>
                        )}
                    </span>
                    <RowRoster
                        participants={row.participants}
                        filer={row}
                        links={false}
                    />
                    <span className={styles.boardLine}>
                        {row.board}
                        {row.video && (
                            <span className={styles.video}>
                                <PlayFill size={11} aria-hidden />
                                {row.video}
                            </span>
                        )}
                    </span>
                </span>
                <span
                    className={styles.rank}
                    data-medal={row.rank != null ? MEDAL[row.rank] : undefined}
                    title={
                        row.rank != null
                            ? `Would place #${row.rank} on the board`
                            : undefined
                    }
                >
                    {row.rank != null ? `#${row.rank}` : ''}
                </span>
                <span className={styles.rowTime}>
                    <DurationToFormatted duration={row.timeMs} />
                </span>
                {row.delta === null || row.delta === 'first' ? (
                    <span
                        className={styles.delta}
                        data-none
                        title={
                            row.delta === 'first'
                                ? 'Their first run on this board'
                                : undefined
                        }
                    >
                        {row.delta === 'first' ? 'First' : ''}
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
                <span
                    className={styles.wait}
                    title="How long it has waited"
                    suppressHydrationWarning
                >
                    {ageLabel(row.waitingSince, now)}
                </span>
            </button>
        </li>
    );
}
