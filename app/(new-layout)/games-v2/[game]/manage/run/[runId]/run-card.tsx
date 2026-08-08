'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type { RunDetail } from '../../../../../../../types/leaderboards.types';
import { VariablesLine, VerificationBadge } from '../../../run-view/run-badges';
import type { ModVerb } from '../../moderation/shared/action-model';
import { RunActionDialog } from '../../moderation/shared/run-action-dialog';
import styles from './run-card.module.scss';

interface Props {
    run: RunDetail;
    gameSlug: string;
}

// Mirrors the run inspector's footer: run-scoped verdicts only (Verify /
// Restore / Remove), state-driven. Runner-scoped actions (ban, anonymize)
// are deliberately NOT here — they require clicking through to the runner
// page, same rule the board drawer follows.
export function RunCard({ run, gameSlug }: Props) {
    const router = useRouter();
    const [modVerb, setModVerb] = useState<ModVerb | null>(null);
    const isRejected = run.verificationStatus === 'rejected';
    const isVerified = run.verificationStatus === 'verified';

    return (
        <section className={styles.card}>
            <div className={styles.metaRow}>
                <div>
                    <span className={styles.metaLabel}>Real time</span>
                    <span className={styles.metaValue}>
                        {run.realTime != null ? (
                            <DurationToFormatted duration={run.realTime} />
                        ) : (
                            '—'
                        )}
                    </span>
                </div>
                <div>
                    <span className={styles.metaLabel}>Game time</span>
                    <span className={styles.metaValue}>
                        {run.gameTime != null ? (
                            <DurationToFormatted duration={run.gameTime} />
                        ) : (
                            '—'
                        )}
                    </span>
                </div>
                <div>
                    <span className={styles.metaLabel}>Run date</span>
                    <span className={styles.metaText}>
                        {run.runDate ? formatRunDate(run.runDate) : '—'}
                    </span>
                </div>
                <div>
                    <span className={styles.metaLabel}>VOD</span>
                    {run.vodUrl ? (
                        <a
                            className={styles.metaText}
                            href={run.vodUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Link
                        </a>
                    ) : (
                        <span className={styles.metaText}>—</span>
                    )}
                </div>
                <div className={styles.badgeSlot}>
                    <VerificationBadge status={run.verificationStatus} />
                </div>
            </div>

            <VariablesLine variables={run.variables} />

            <hr className={styles.divider} />

            <div className={styles.actionsRow}>
                {isRejected && (
                    <span className={styles.rejectedNote}>
                        This run has already been rejected.
                    </span>
                )}
                <div className={styles.actions}>
                    {!isVerified && (
                        <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() => setModVerb('approve')}
                        >
                            Approve run
                        </button>
                    )}
                    {!isRejected && (
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => setModVerb('remove')}
                        >
                            Remove run…
                        </button>
                    )}
                    {isRejected && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setModVerb('restore')}
                        >
                            Restore run
                        </button>
                    )}
                    {!run.isGuest && run.userId != null && (
                        <Link
                            className="btn btn-sm btn-outline-secondary ms-auto"
                            href={`/games-v2/${encodeURIComponent(gameSlug)}/manage/moderation/runner/${run.userId}`}
                        >
                            Runner page →
                        </Link>
                    )}
                </div>
            </div>

            {modVerb && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb={modVerb}
                    target={{
                        kind: 'runs',
                        runIds: [run.runId],
                        label: `${run.runnerName}'s run`,
                    }}
                    onDone={() => {
                        setModVerb(null);
                        router.refresh();
                    }}
                    onClose={() => setModVerb(null)}
                />
            )}
        </section>
    );
}
