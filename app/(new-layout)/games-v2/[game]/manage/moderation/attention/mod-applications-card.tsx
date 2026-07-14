'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type {
    BoardClaimRequest,
    BoardModRole,
} from '../../../../../../../types/board-claims.types';
import {
    approveApplicationAction,
    denyApplicationAction,
} from './actions/decide-application.action';

interface Props {
    gameSlug: string;
    applications: BoardClaimRequest[];
}

export function ModApplicationsCard({ gameSlug, applications }: Props) {
    const router = useRouter();
    const [decided, setDecided] = useState<Set<number>>(new Set());
    const [isPending, startPending] = useTransition();

    const remaining = applications.filter((a) => !decided.has(a.id));
    if (remaining.length === 0) return null;

    const decide = (
        id: number,
        action: () => Promise<{ ok: true } | { error: string }>,
        msg: string,
    ) => {
        startPending(async () => {
            const res = await action();
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(msg);
            setDecided((prev) => new Set(prev).add(id));
            router.refresh();
        });
    };

    return (
        <div className="card mb-3 border-info">
            <div className="card-header">
                <strong>Moderator applications</strong>{' '}
                <span className="text-muted small">
                    {remaining.length} pending
                </span>
            </div>
            <div className="card-body">
                {remaining.map((r) => (
                    <ApplicationRow
                        key={r.id}
                        request={r}
                        disabled={isPending}
                        onApprove={(role) =>
                            decide(
                                r.id,
                                () =>
                                    approveApplicationAction({
                                        gameSlug,
                                        claimId: r.id,
                                        role,
                                    }),
                                `Added ${r.username} to the mod team`,
                            )
                        }
                        onDeny={(reason) =>
                            decide(
                                r.id,
                                () =>
                                    denyApplicationAction({
                                        gameSlug,
                                        claimId: r.id,
                                        reason,
                                    }),
                                `Denied ${r.username}`,
                            )
                        }
                    />
                ))}
            </div>
        </div>
    );
}

function ApplicationRow({
    request,
    disabled,
    onApprove,
    onDeny,
}: {
    request: BoardClaimRequest;
    disabled: boolean;
    onApprove: (role: BoardModRole) => void;
    onDeny: (reason: string) => void;
}) {
    const [role, setRole] = useState<BoardModRole>('game-mod');
    const s = request.signals;
    return (
        <div className="border rounded p-2 mb-2">
            <div className="d-flex gap-2 align-items-center flex-wrap">
                <strong>{request.username}</strong>
                <span className="text-muted small">
                    {s.runsOnGame} runs on this game · {s.totalRuns} total
                </span>
            </div>
            <p className="mb-2 mt-1 small" style={{ whiteSpace: 'pre-wrap' }}>
                {request.motivation}
            </p>
            <div className="d-flex gap-2 align-items-center">
                <select
                    className="form-select form-select-sm w-auto"
                    value={role}
                    onChange={(e) => setRole(e.target.value as BoardModRole)}
                >
                    <option value="game-mod">Moderator</option>
                    <option value="game-admin">Board admin</option>
                </select>
                <button
                    type="button"
                    className="btn btn-sm btn-success"
                    disabled={disabled}
                    onClick={() => onApprove(role)}
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
                        onDeny(reason);
                    }}
                >
                    Deny
                </button>
            </div>
        </div>
    );
}
