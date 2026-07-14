'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import type { BoardClaimGroup } from '~src/lib/setup/group-claims';
import type {
    BoardClaimRequest,
    BoardModRole,
} from '../../../../types/board-claims.types';
import {
    approveClaimAction,
    denyClaimAction,
} from './actions/decide-claim.action';

const STALE_DAYS = 7;

function isStale(createdAt: string): boolean {
    return (
        Date.now() - new Date(createdAt).getTime() >
        STALE_DAYS * 24 * 60 * 60 * 1000
    );
}

interface Props {
    groups: BoardClaimGroup[];
}

export function BoardClaimsClient({ groups }: Props) {
    const [isPending, startPending] = useTransition();

    const decide = (
        action: () => Promise<{ ok: true } | { error: string }>,
        successMsg: string,
    ) => {
        startPending(async () => {
            const res = await action();
            if ('error' in res) toast.error(res.error);
            else toast.success(successMsg);
        });
    };

    if (groups.length === 0) {
        return (
            <div className="container py-4">
                <h1>Board applications</h1>
                <p className="text-muted">No pending applications.</p>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <h1>Board applications</h1>
            <p className="text-muted">
                Approving grants a per-game moderator role and notifies the
                applicant with a link to the setup wizard.
            </p>
            {groups.map((g) => (
                <div key={g.gameId} className="card mb-3">
                    <div className="card-header d-flex align-items-center gap-2">
                        <Link href={`/games-v2/${g.gameSlug}`}>
                            <strong>{g.gameDisplay}</strong>
                        </Link>
                        {g.board && (
                            <span className="text-muted small">
                                {g.board.uniqueRunners} runners ·{' '}
                                {g.board.totalFinishedRuns} runs
                            </span>
                        )}
                        {g.requests.length > 1 && (
                            <span className="badge bg-info ms-auto">
                                {g.requests.length} rival applications
                            </span>
                        )}
                    </div>
                    <div className="card-body">
                        {g.requests.map((r) => (
                            <ClaimRow
                                key={r.id}
                                request={r}
                                disabled={isPending}
                                onDecide={decide}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ClaimRow({
    request,
    disabled,
    onDecide,
}: {
    request: BoardClaimRequest;
    disabled: boolean;
    onDecide: (
        action: () => Promise<{ ok: true } | { error: string }>,
        successMsg: string,
    ) => void;
}) {
    const [role, setRole] = useState<BoardModRole>('game-admin');
    const s = request.signals;

    return (
        <div className="border rounded p-3 mb-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
                <Link href={`/${request.username}`}>
                    <strong>{request.username}</strong>
                </Link>
                <span className="text-muted small">
                    {s.runsOnGame} runs on this game · {s.totalRuns} total ·
                    account since{' '}
                    {s.accountCreatedAt
                        ? new Date(s.accountCreatedAt).toLocaleDateString()
                        : 'unknown'}{' '}
                    · {s.priorApprovals} prior approvals · {s.priorDenials}{' '}
                    prior denials
                </span>
                {isStale(request.createdAt) && (
                    <span className="badge bg-warning text-dark">stale</span>
                )}
            </div>
            <p className="mb-2 mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                {request.motivation}
            </p>
            <div className="d-flex align-items-center gap-2">
                <select
                    className="form-select form-select-sm w-auto"
                    value={role}
                    onChange={(e) => setRole(e.target.value as BoardModRole)}
                >
                    <option value="game-admin">
                        Board admin (full control)
                    </option>
                    <option value="game-mod">
                        Board moderator (verify + configure)
                    </option>
                </select>
                <button
                    type="button"
                    className="btn btn-sm btn-success"
                    disabled={disabled}
                    onClick={() =>
                        onDecide(
                            () => approveClaimAction(request.id, role),
                            `Approved ${request.username}`,
                        )
                    }
                >
                    Approve
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    disabled={disabled}
                    onClick={() => {
                        const reason = window.prompt('Reason (optional):');
                        if (reason === null) return; // Cancel aborts
                        onDecide(
                            () => denyClaimAction(request.id, reason),
                            `Denied ${request.username}`,
                        );
                    }}
                >
                    Deny
                </button>
            </div>
        </div>
    );
}
