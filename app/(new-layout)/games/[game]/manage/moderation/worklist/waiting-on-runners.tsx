'use client';

import { useState, useTransition } from 'react';
import { ChevronRight } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { buildRunHref } from '~src/lib/board-url';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import type { WaitingOnRunners } from '../../../../../../../types/worklist.types';
import { RunnerAvatar } from '../../../leaderboard/runner-avatar';
import { RowRoster } from '../shared/row-roster';
import { nudgeRunsAction, waiveVideoAction } from './actions/worklist.action';
import { ageLabel, boardLabel, remindedLabel } from './worklist-model';
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
            ? 'Off the board until the runner adds a video'
            : submissions === waiting.count
              ? 'Held until the runner submits'
              : 'A video or a submission from the runner';

    return (
        <section
            className={styles.section}
            data-tone="quiet"
            aria-label="Waiting on runners"
        >
            <button
                type="button"
                className={styles.sectionToggle}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <span className={styles.sectionDot} aria-hidden />
                <span className={styles.sectionTitle}>Waiting on runners</span>
                <span className={styles.sectionCount}>
                    {waiting.count.toLocaleString()}
                </span>
                <span className={styles.sectionHint}>{heading}</span>
                <span className={styles.sectionMore}>
                    {open ? 'Hide' : 'Show'}
                    <ChevronRight
                        className={styles.chevron}
                        data-open={open || undefined}
                        aria-hidden
                    />
                </span>
            </button>
            {open && (
                <ul className={styles.rows}>
                    {waiting.items.map((w) => (
                        <li key={w.runId} className={styles.waitRow}>
                            <RunnerAvatar
                                name={w.runnerName}
                                picture={w.runnerPicture ?? null}
                                size="md"
                            />
                            <span className={styles.runner}>
                                <span className={styles.queueRunnerName}>
                                    {w.runnerName}
                                </span>
                                {/* Who the run credits, when that is not
                                    the filer alone (guide §6a). */}
                                <RowRoster
                                    participants={w.participants}
                                    filer={w}
                                />
                                <span className={styles.boardLine}>
                                    {boardLabel(w, variables)}
                                </span>
                            </span>
                            <Link
                                href={buildRunHref(gameSlug, w.runId)}
                                className={styles.waitTime}
                            >
                                <DurationToFormatted duration={w.timeMs} />
                            </Link>
                            <span
                                className={styles.waitStatus}
                                suppressHydrationWarning
                            >
                                <span>
                                    {w.waitingFor === 'submission'
                                        ? 'Needs submitting'
                                        : 'Needs a video'}
                                    {w.askedAt &&
                                        ` · asked ${ageLabel(w.askedAt, now)} ago`}
                                </span>
                                {w.lastNudgedAt && (
                                    <span className={styles.waitNudged}>
                                        {remindedLabel(w.lastNudgedAt, now)}
                                    </span>
                                )}
                            </span>
                            <span className={styles.verbs}>
                                <button
                                    type="button"
                                    className={styles.verb}
                                    disabled={busy}
                                    onClick={() => act(w.runId, 'nudge')}
                                >
                                    Remind
                                </button>
                                {w.waitingFor === 'submission' ? (
                                    <button
                                        type="button"
                                        className={styles.verb}
                                        disabled={busy}
                                        onClick={() => onAccept(w)}
                                    >
                                        Review
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
                            </span>
                        </li>
                    ))}
                    {waiting.count > waiting.items.length && (
                        <li className={styles.moreNote}>
                            Showing the {waiting.items.length} oldest.
                        </li>
                    )}
                </ul>
            )}
        </section>
    );
}
