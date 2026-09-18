'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import type {
    BoardClaimRequest,
    BoardModRole,
} from '../../../../../../../types/board-claims.types';
import { PromptDialog } from '../../../shared/prompt-dialog';
import {
    approveApplicationAction,
    denyApplicationAction,
} from './actions/decide-application.action';
import styles from './mod-applications-card.module.scss';

interface Props {
    gameSlug: string;
    applications: BoardClaimRequest[];
}

export function ModApplicationsCard({ gameSlug, applications }: Props) {
    const router = useRouter();
    const [decided, setDecided] = useState<Set<number>>(new Set());

    const remaining = applications.filter((a) => !decided.has(a.id));
    if (remaining.length === 0) return null;

    // Awaited by each row so it can manage its own pending/error state
    // (e.g. the deny dialog) rather than sharing one list-wide pending flag.
    const decide = async (
        id: number,
        action: () => Promise<{ ok: true } | { error: string }>,
        msg: string,
    ): Promise<{ ok: true } | { error: string }> => {
        const res = await action();
        if ('error' in res) return res;
        toast.success(msg);
        setDecided((prev) => new Set(prev).add(id));
        router.refresh();
        return res;
    };

    return (
        <section className={styles.card}>
            <div className={styles.head}>
                <h2 className={styles.title}>Moderator applications</h2>
                <span className={styles.headCount}>
                    {remaining.length} pending
                </span>
            </div>
            <div>
                {remaining.map((r) => (
                    <ApplicationRow
                        key={r.id}
                        request={r}
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
        </section>
    );
}

function ApplicationRow({
    request,
    onApprove,
    onDeny,
}: {
    request: BoardClaimRequest;
    onApprove: (
        role: BoardModRole,
    ) => Promise<{ ok: true } | { error: string }>;
    onDeny: (reason: string) => Promise<{ ok: true } | { error: string }>;
}) {
    const [role, setRole] = useState<BoardModRole>('game-mod');
    const [denyOpen, setDenyOpen] = useState(false);
    const [approvePending, setApprovePending] = useState(false);
    const [denyPending, setDenyPending] = useState(false);
    const [denyError, setDenyError] = useState<string | null>(null);
    // Local to this row — approving or denying one application shouldn't
    // disable another row's buttons.
    const busy = approvePending || denyPending;
    const s = request.signals;

    const handleApprove = async () => {
        setApprovePending(true);
        const res = await onApprove(role);
        setApprovePending(false);
        if ('error' in res) toast.error(res.error);
    };

    const closeDeny = () => {
        setDenyOpen(false);
        setDenyError(null);
    };

    const submitDeny = async (reason: string) => {
        setDenyPending(true);
        setDenyError(null);
        const res = await onDeny(reason);
        if ('error' in res) {
            setDenyPending(false);
            setDenyError(res.error);
            return;
        }
        setDenyPending(false);
        setDenyOpen(false);
    };

    return (
        <div className={styles.row}>
            <div className={styles.rowTop}>
                <span className={styles.applicant}>{request.username}</span>
                <span className={styles.signals}>
                    {s.runsOnGame} runs on this game · {s.totalRuns} total
                </span>
            </div>
            <p className={styles.motivation}>{request.motivation}</p>
            <div className={styles.rowActions}>
                <select
                    className={styles.roleSelect}
                    aria-label="Role to grant"
                    value={role}
                    onChange={(e) => setRole(e.target.value as BoardModRole)}
                    disabled={busy}
                >
                    <option value="game-mod">Moderator</option>
                    <option value="game-admin">Board admin</option>
                </select>
                <button
                    type="button"
                    className={styles.approveBtn}
                    disabled={busy}
                    onClick={handleApprove}
                >
                    {approvePending ? 'Approving…' : 'Approve'}
                </button>
                <button
                    type="button"
                    className={styles.denyBtn}
                    disabled={busy}
                    onClick={() => setDenyOpen(true)}
                >
                    Deny
                </button>
            </div>
            <PromptDialog
                open={denyOpen}
                onClose={closeDeny}
                onSubmit={submitDeny}
                labelledBy={`deny-application-${request.id}-title`}
                title={`Deny ${request.username}?`}
                blurb="They can reapply. A reason is optional, but helps if they ask why."
                fieldLabel="Reason (optional)"
                placeholder="e.g. Not enough run history on this board yet"
                multiline
                submitLabel="Deny application"
                submitVariant="danger"
                pending={denyPending}
                error={denyError}
            />
        </div>
    );
}
