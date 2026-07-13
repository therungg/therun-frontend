import type React from 'react';
import { UserLink } from '~src/components/links/links';
import { Vod } from '~src/components/run/dashboard/vod';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    ResolvedGame,
    RunOrigin,
    RunOriginRef,
} from '../../../../../types/leaderboards.types';
import type { HistoryEvent } from '../../../../../types/moderation.types';
import { OriginPanel } from './origin-panel';
import { RunActions } from './run-actions';
import { RunHistoryList } from './run-history-list';

export interface RunViewModel {
    kind: 'run' | 'manual';
    id: number; // runId or manualTimeId
    game: ResolvedGame;
    categoryDisplay: string;
    subcategoryKey: string;
    runnerName: string;
    userId: number | null;
    isGuest: boolean;
    realTime: number | null;
    gameTime: number | null;
    runDate: string | null; // null for manual times (no run date)
    vodUrl: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    variables: Record<string, string>;
    origin: RunOrigin | null;
    verifiedBy: RunOriginRef | null;
    rejectionReason: string | null;
}

// Reimplemented (not lifted) from manage/run/[runId]/run-card.tsx — those copies
// are private to that file and lifting them would require editing run-card.tsx,
// which is outside this task's commit scope. Markup kept identical.
function VerificationBadge({
    status,
}: {
    status: RunViewModel['verificationStatus'];
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

export function RunView({
    model,
    history,
    sessionUsername,
    modPanel,
}: {
    model: RunViewModel;
    history: HistoryEvent[]; // [] for manual times
    sessionUsername: string | null;
    modPanel?: React.ReactNode; // mod layer slot, page decides
}): React.JSX.Element {
    const primaryTime = model.realTime ?? model.gameTime;
    const isRejected = model.verificationStatus === 'rejected';

    return (
        <div>
            <header className="d-flex align-items-center gap-3 mb-3">
                {model.game.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={model.game.image}
                        width={48}
                        height={64}
                        style={{ aspectRatio: '3 / 4' }}
                        alt=""
                    />
                )}
                <div>
                    <h1 className="h4 mb-0">
                        {model.isGuest ? (
                            model.runnerName
                        ) : (
                            <UserLink username={model.runnerName} />
                        )}{' '}
                        —{' '}
                        {primaryTime != null ? (
                            <DurationToFormatted duration={primaryTime} />
                        ) : (
                            '—'
                        )}
                    </h1>
                    <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
                        <span className="badge text-bg-secondary">
                            {model.categoryDisplay}
                        </span>
                        {model.subcategoryKey && (
                            <span className="badge text-bg-secondary">
                                {model.subcategoryKey}
                            </span>
                        )}
                        <VerificationBadge status={model.verificationStatus} />
                        {model.verifiedBy && (
                            <span className="text-muted small">
                                verified by {model.verifiedBy.name}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {isRejected && model.rejectionReason && (
                <div className="alert alert-warning small">
                    Rejected: {model.rejectionReason}
                </div>
            )}

            <div className="row g-3">
                <div className="col-lg-8">
                    {model.vodUrl ? (
                        <div style={{ width: '100%', aspectRatio: '16 / 9' }}>
                            <Vod vod={model.vodUrl} />
                        </div>
                    ) : (
                        <div
                            className="border rounded d-flex align-items-center justify-content-center text-muted"
                            style={{ aspectRatio: '16 / 9' }}
                        >
                            No video attached
                        </div>
                    )}
                </div>
                <div className="col-lg-4 d-flex flex-column gap-3">
                    <div className="border rounded p-3">
                        <div className="d-flex flex-wrap gap-3 mb-2">
                            <div>
                                <small className="text-muted d-block">
                                    Real Time
                                </small>
                                <strong className="fs-5">
                                    {model.realTime != null ? (
                                        <DurationToFormatted
                                            duration={model.realTime}
                                        />
                                    ) : (
                                        '—'
                                    )}
                                </strong>
                            </div>
                            <div>
                                <small className="text-muted d-block">
                                    Game Time
                                </small>
                                <strong className="fs-5">
                                    {model.gameTime != null ? (
                                        <DurationToFormatted
                                            duration={model.gameTime}
                                        />
                                    ) : (
                                        '—'
                                    )}
                                </strong>
                            </div>
                            {model.runDate && (
                                <div>
                                    <small className="text-muted d-block">
                                        Run date
                                    </small>
                                    <span>
                                        {new Date(
                                            model.runDate,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <VariablesLine vars={model.variables} />
                    </div>
                    <OriginPanel model={model} />
                    <RunActions
                        model={model}
                        sessionUsername={sessionUsername}
                    />
                </div>
            </div>

            <RunHistoryList events={history} />
            {modPanel}
        </div>
    );
}
