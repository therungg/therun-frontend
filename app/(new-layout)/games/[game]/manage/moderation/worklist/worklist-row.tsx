'use client';

import { PlayFill } from 'react-bootstrap-icons';
import { DurationToFormatted } from '~src/components/util/datetime';
import { RunnerAvatar } from '../../../leaderboard/runner-avatar';
import { RowRoster } from '../shared/row-roster';
import { ageLabel, type QueueRowView } from './worklist-model';
import styles from './worklist-pane.module.scss';

const MEDAL: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

/**
 * One queue row. The whole row opens the run for review; the checkbox beside
 * it picks the run for "Verify N selected", and is only there when the list
 * can verify it (a pending run that isn't the moderator's own).
 */
export function WorklistRow({
    row,
    now,
    focused = false,
    picked = false,
    onTogglePick,
    onOpen,
}: {
    row: QueueRowView;
    now: Date;
    /** The keyboard is on this row. */
    focused?: boolean;
    picked?: boolean;
    /** Absent when the row can't be picked. */
    onTogglePick?: (runId: number) => void;
    onOpen: (row: QueueRowView) => void;
}) {
    const hasTags = row.newRunner || row.chips.length > 0 || !!row.trackRecord;
    return (
        <li className={styles.queueItem} data-tone={row.why.tone}>
            {onTogglePick && (
                <input
                    type="checkbox"
                    className={`form-check-input ${styles.pick}`}
                    aria-label={`Select run by ${row.runnerName}`}
                    checked={picked}
                    onChange={() => onTogglePick(row.runId)}
                />
            )}
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
                        {row.isOwn && (
                            <span className={styles.guest}>yours</span>
                        )}
                    </span>
                    <RowRoster
                        participants={row.participants}
                        filer={row}
                        links={false}
                    />
                    <span className={styles.boardLine}>
                        {row.board}
                        {row.video ? (
                            <span className={styles.video}>
                                <PlayFill size={11} aria-hidden />
                                {row.video}
                            </span>
                        ) : (
                            <span className={styles.noVideo}>No video</span>
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
                {row.delta === 'first' ? (
                    <span
                        className={styles.delta}
                        data-none
                        title="Their first run on this board"
                    >
                        First
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
                <span className={styles.why}>
                    <span
                        className={styles.whyLine}
                        data-tone={row.why.tone}
                        title={row.why.title}
                    >
                        {row.why.text}
                    </span>
                    {hasTags && (
                        <span className={styles.tags}>
                            {row.newRunner && (
                                <span className={styles.tag} data-new>
                                    New runner
                                </span>
                            )}
                            {row.chips.map((c) => (
                                <span key={c} className={styles.tag}>
                                    {c}
                                </span>
                            ))}
                            {row.trackRecord && (
                                <span
                                    className={styles.record}
                                    title="Their runs on this game"
                                >
                                    {row.trackRecord}
                                </span>
                            )}
                        </span>
                    )}
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
