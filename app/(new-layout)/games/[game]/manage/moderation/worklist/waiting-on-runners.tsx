'use client';

import { useState, useTransition } from 'react';
import { ChevronRight } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { buildRunHref } from '~src/lib/board-url';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import type { WaitingOnRunners } from '../../../../../../../types/worklist.types';
import { RowRoster } from '../shared/row-roster';
import { nudgeRunsAction, waiveVideoAction } from './actions/worklist.action';
import { boardLabel, remindedLabel, waitingLabel } from './worklist-model';
import styles from './worklist-pane.module.scss';

/**
 * Runs the board is waiting on a *person* for, not a moderator: one off the board
 * until its owner adds a video, and a PB held until its runner submits it. Not
 * work — nothing here counts toward what is waiting on the moderator — but a
 * moderator can end the wait either way.
 *
 * The escape hatch matters more than it looks. An account that has never been
 * signed into cannot be shown the submission form, so without a way for a
 * moderator to rule on a held run, those PBs would wait forever.
 */
export type WaitingRun = WaitingOnRunners['items'][number];

export function WaitingOnRunnersSection({
    gameSlug,
    waiting,
    variables,
    onChanged,
    onAccept,
}: {
    gameSlug: string;
    waiting: WaitingOnRunners;
    variables: VariableRow[];
    onChanged: () => void;
    /** Opens the moderate modal on the run, approving it. */
    onAccept: (run: WaitingRun) => void;
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
            else if (res.count > 0)
                toast.success(
                    'Accepted without a video. The run is back on the board as pending.',
                );
            else
                toast.info(
                    'Nothing changed. The run is no longer waiting for a video.',
                );
            onChanged();
        });

    const submissions = waiting.items.filter(
        (w) => w.waitingFor === 'submission',
    ).length;
    const heading =
        submissions === 0
            ? `${waiting.count} ${waiting.count === 1 ? 'run is' : 'runs are'} waiting for the runner to add a video`
            : submissions === waiting.count
              ? `${waiting.count} ${waiting.count === 1 ? 'run is' : 'runs are'} waiting for the runner to submit ${waiting.count === 1 ? 'it' : 'them'}`
              : `${waiting.count} runs are waiting on their runners`;

    return (
        <section className={styles.section}>
            <button
                type="button"
                className={styles.quietToggle}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <ChevronRight
                    className={styles.chevron}
                    data-open={open || undefined}
                    aria-hidden
                />
                {heading}
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
                                <span className={styles.meta}>
                                    {w.waitingFor === 'submission'
                                        ? 'needs submitting'
                                        : 'needs a video'}
                                </span>
                                <span className={styles.runner}>
                                    <span className={styles.runnerName}>
                                        {w.runnerName}
                                    </span>
                                    {/* Who the run credits, when that is not
                                        the filer alone (guide §6a). */}
                                    <RowRoster
                                        participants={w.participants}
                                        filer={w}
                                    />
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
                                    <Link
                                        href={buildRunHref(gameSlug, w.runId)}
                                        className={styles.timeLink}
                                    >
                                        <DurationToFormatted
                                            duration={w.timeMs}
                                        />
                                    </Link>
                                </span>
                            </div>
                            <div className={styles.verbs}>
                                <button
                                    type="button"
                                    className={styles.verb}
                                    disabled={busy}
                                    onClick={() => act(w.runId, 'nudge')}
                                >
                                    Remind runner
                                </button>
                                {w.waitingFor === 'submission' ? (
                                    <button
                                        type="button"
                                        className={styles.verb}
                                        disabled={busy}
                                        onClick={() => onAccept(w)}
                                    >
                                        Accept without waiting
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className={styles.verb}
                                        disabled={busy}
                                        onClick={() => act(w.runId, 'waive')}
                                    >
                                        Accept without video
                                    </button>
                                )}
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
