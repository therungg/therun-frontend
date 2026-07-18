'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type {
    BoardClaimRequest,
    BoardModRole,
} from '../../../../../../../types/board-claims.types';
import { PromptDialog } from '../../../shared/prompt-dialog';
import styles from '../../console/console.module.scss';
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
        <div className={`${styles.surface} mb-3`}>
            <div className={styles.paneHeader}>
                <h2 className={styles.paneTitle}>Moderator applications</h2>
                <span className={styles.paneCount}>
                    {remaining.length} pending
                </span>
            </div>
            <div>
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
    const [denyOpen, setDenyOpen] = useState(false);
    const s = request.signals;
    return (
        <div className={`${styles.item} ${styles.sevLow} mb-2`}>
            <div className={styles.itemTop}>
                <strong>{request.username}</strong>
                <span className="text-muted small">
                    {s.runsOnGame} runs on this game · {s.totalRuns} total
                </span>
            </div>
            <p className="mb-2 mt-1 small" style={{ whiteSpace: 'pre-wrap' }}>
                {request.motivation}
            </p>
            <div className={styles.actionRow}>
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
                    className="btn btn-sm btn-primary"
                    disabled={disabled}
                    onClick={() => onApprove(role)}
                >
                    Approve
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    disabled={disabled}
                    onClick={() => setDenyOpen(true)}
                >
                    Deny
                </button>
            </div>
            <PromptDialog
                open={denyOpen}
                onClose={() => setDenyOpen(false)}
                onSubmit={(reason) => {
                    setDenyOpen(false);
                    onDeny(reason);
                }}
                labelledBy={`deny-application-${request.id}-title`}
                title={`Deny ${request.username}?`}
                blurb="They can reapply. A reason is optional, but helps if they ask why."
                fieldLabel="Reason (optional)"
                placeholder="e.g. Not enough run history on this board yet"
                multiline
                submitLabel="Deny application"
                submitVariant="danger"
                pending={disabled}
            />
        </div>
    );
}
