'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import type { WaitingOnRunners } from '../../../../../../../types/worklist.types';
import { nudgeRunsAction, waiveVideoAction } from './actions/worklist.action';
import { boardLabel, remindedLabel, waitingLabel } from './worklist-model';
import styles from './worklist-pane.module.scss';

/**
 * Runs off the board until their owner adds a video. Not work: nothing here
 * counts toward what's waiting on the moderator. Two verbs: remind the runner,
 * or accept the run without a video.
 */
export function WaitingOnRunnersSection({
    gameSlug,
    waiting,
    variables,
    onChanged,
}: {
    gameSlug: string;
    waiting: WaitingOnRunners;
    variables: VariableRow[];
    onChanged: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [busy, startBusy] = useTransition();
    const now = new Date();
    if (waiting.count === 0) return null;

    const act = (runId: number, verb: 'nudge' | 'waive') =>
        startBusy(async () => {
            const res =
                verb === 'nudge'
                    ? await nudgeRunsAction(gameSlug, [runId])
                    : await waiveVideoAction(gameSlug, [runId]);
            if ('error' in res) return void toast.error(res.error);
            if (verb === 'nudge')
                toast.success(
                    res.count > 0
                        ? 'Runner reminded.'
                        : 'Already reminded in the last day.',
                );
            else
                toast.success(
                    'Accepted without a video. The run is back on the board as pending.',
                );
            onChanged();
        });

    return (
        <section className={styles.tier}>
            <button
                type="button"
                className={styles.batchToggle}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                {waiting.count} {waiting.count === 1 ? 'run is' : 'runs are'}{' '}
                waiting for the runner to add a video
            </button>
            {open && (
                <ul className={styles.rows}>
                    {waiting.items.map((w) => (
                        <li key={w.runId} className={styles.row}>
                            <div className={styles.rowMain}>
                                <span
                                    className={styles.age}
                                    suppressHydrationWarning
                                >
                                    {w.askedAt
                                        ? waitingLabel(w.askedAt, now)
                                        : 'Not asked yet'}
                                </span>
                                <span className={styles.runner}>
                                    <span className={styles.runnerName}>
                                        {w.runnerName}
                                    </span>
                                    {w.lastNudgedAt && (
                                        <span
                                            className={styles.meta}
                                            suppressHydrationWarning
                                        >
                                            {remindedLabel(w.lastNudgedAt, now)}
                                        </span>
                                    )}
                                </span>
                                <span className={styles.board}>
                                    {boardLabel(w, variables)}
                                </span>
                                <span className={styles.time}>
                                    <DurationToFormatted duration={w.timeMs} />
                                </span>
                            </div>
                            <div className={styles.verbs}>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={busy}
                                    onClick={() => act(w.runId, 'nudge')}
                                >
                                    Remind runner
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={busy}
                                    onClick={() => act(w.runId, 'waive')}
                                >
                                    Accept without video
                                </button>
                            </div>
                        </li>
                    ))}
                    {waiting.count > waiting.items.length && (
                        <li className={styles.meta}>
                            Showing the {waiting.items.length} oldest.
                        </li>
                    )}
                </ul>
            )}
        </section>
    );
}
