'use client';

import Link from 'next/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { RunDetail } from '../../../../../../../types/leaderboards.types';
import { ExcludeUserControl } from './exclude-user-control';
import { RejectControl } from './reject-control';

interface Props {
    run: RunDetail;
    gameSlug: string;
    canExcludeUsers: boolean;
}

function VerificationBadge({
    status,
}: {
    status: RunDetail['verificationStatus'];
}) {
    if (status === 'verified') {
        return (
            <span className="badge text-bg-success" aria-label="verified">
                ✓ Verified
            </span>
        );
    }
    if (status === 'pending') {
        return (
            <span className="badge text-bg-warning" aria-label="pending">
                ⌛ Pending
            </span>
        );
    }
    return (
        <span
            className="badge text-bg-secondary opacity-75"
            aria-label="rejected"
        >
            Rejected
        </span>
    );
}

function VariablesLine({ vars }: { vars: Record<string, string> }) {
    const entries = Object.entries(vars);
    if (entries.length === 0) return null;
    const text = entries.map(([k, v]) => `${k}=${v}`).join(', ');
    return (
        <div
            className="text-muted small text-truncate"
            title={text}
            style={{ maxWidth: '100%' }}
        >
            {text}
        </div>
    );
}

export function RunCard({ run, gameSlug, canExcludeUsers }: Props) {
    const isRejected = run.verificationStatus === 'rejected';
    const canExcludeThisRunner =
        canExcludeUsers && !run.isGuest && run.userId != null;

    return (
        <section className="border rounded p-3">
            <div className="d-flex flex-wrap align-items-baseline gap-3 mb-2">
                <div>
                    <small className="text-muted d-block">Real Time</small>
                    <strong className="fs-5">
                        {run.realTime != null ? (
                            <DurationToFormatted duration={run.realTime} />
                        ) : (
                            '—'
                        )}
                    </strong>
                </div>
                <div>
                    <small className="text-muted d-block">Game Time</small>
                    <strong className="fs-5">
                        {run.gameTime != null ? (
                            <DurationToFormatted duration={run.gameTime} />
                        ) : (
                            '—'
                        )}
                    </strong>
                </div>
                <div>
                    <small className="text-muted d-block">Run date</small>
                    <span>
                        {run.runDate
                            ? new Date(run.runDate).toLocaleDateString()
                            : '—'}
                    </span>
                </div>
                <div>
                    <small className="text-muted d-block">VOD</small>
                    {run.vodUrl ? (
                        <a href={run.vodUrl} target="_blank" rel="noreferrer">
                            Link
                        </a>
                    ) : (
                        '—'
                    )}
                </div>
                <div className="ms-auto">
                    <VerificationBadge status={run.verificationStatus} />
                </div>
            </div>

            <VariablesLine vars={run.variables} />

            <hr className="my-3" />

            {isRejected ? (
                <div className="d-flex align-items-center gap-3">
                    <span className="text-muted small">
                        This run has already been rejected.
                    </span>
                    <Link
                        href={`/games-v2/${gameSlug}`}
                        className="btn btn-sm btn-outline-secondary ms-auto"
                    >
                        Back to leaderboard
                    </Link>
                </div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    <RejectControl
                        runId={run.runId}
                        gameSlug={gameSlug}
                        categoryId={run.categoryId}
                        subcategoryKey={run.subcategoryKey}
                    />
                    {canExcludeThisRunner && run.userId != null && (
                        <ExcludeUserControl
                            gameSlug={gameSlug}
                            userId={run.userId}
                            categoryId={run.categoryId}
                            runnerName={run.runnerName}
                            gameDisplay={run.gameDisplay}
                            categoryDisplay={run.categoryDisplay}
                        />
                    )}
                </div>
            )}
        </section>
    );
}
