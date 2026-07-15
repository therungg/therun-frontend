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
import styles from './board-claims.module.scss';

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
            <div className={styles.page}>
                <h1 className={styles.title}>Board applications</h1>
                <div className={styles.empty}>No pending applications.</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Board applications</h1>
            <p className="text-muted">
                Approving grants a per-game moderator role and notifies the
                applicant with a link to the setup wizard.
            </p>
            {groups.map((g) => (
                <div key={g.gameId} className={styles.gameCard}>
                    <div className={styles.gameHead}>
                        <Link href={`/games-v2/${g.gameSlug}`}>
                            <strong>{g.gameDisplay}</strong>
                        </Link>
                        {g.board && (
                            <span className={styles.gameMeta}>
                                {g.board.uniqueRunners} runners ·{' '}
                                {g.board.totalFinishedRuns} runs
                            </span>
                        )}
                        {g.requests.length > 1 && (
                            <span className={styles.rivalPill}>
                                {g.requests.length} rival applications
                            </span>
                        )}
                    </div>
                    <div>
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
        <div className={styles.item}>
            <div className={styles.itemTop}>
                <Link href={`/${request.username}`}>
                    <strong>{request.username}</strong>
                </Link>
                <span className={styles.meta}>
                    {s.runsOnGame} runs on this game · {s.totalRuns} total ·
                    account since{' '}
                    {s.accountCreatedAt
                        ? new Date(s.accountCreatedAt).toLocaleDateString()
                        : 'unknown'}{' '}
                    · {s.priorApprovals} prior approvals · {s.priorDenials}{' '}
                    prior denials
                </span>
                {isStale(request.createdAt) && (
                    <span className={styles.stalePill}>stale</span>
                )}
            </div>
            <p className="mb-2 mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                {request.motivation}
            </p>
            <div className={styles.actionRow}>
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
                    className="btn btn-sm btn-primary"
                    disabled={disabled}
                    onClick={() =>
                        onDecide(
                            () =>
                                approveClaimAction(
                                    request.id,
                                    role,
                                    request.gameId,
                                ),
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
