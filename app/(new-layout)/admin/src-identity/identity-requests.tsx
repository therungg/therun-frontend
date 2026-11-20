'use client';

import { useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import { userHref } from '~src/lib/user-href';
import type { SrcUsernameRequest } from '../../../../types/src-admin-sync.types';
import { RunnerAvatar } from '../../games/[game]/leaderboard/runner-avatar';
import {
    approveSrcIdentityRequest,
    rejectSrcIdentityRequest,
} from './actions/src-identity.action';
import styles from './src-identity.module.scss';

type Row = SrcUsernameRequest & { picture: string | null };

const srcProfileHref = (name: string) =>
    `https://www.speedrun.com/users/${encodeURIComponent(name)}`;

export function IdentityRequests({ requests }: { requests: Row[] }) {
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

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>speedrun.com imports</h1>
            {requests.length === 0 ? (
                <div className={styles.empty}>No pending requests.</div>
            ) : (
                <ul className={styles.list}>
                    {requests.map((r) => (
                        <li key={r.id} className={styles.item}>
                            <span className={styles.person}>
                                <RunnerAvatar
                                    name={r.username}
                                    picture={r.picture}
                                    size="sm"
                                />
                                <Link href={userHref(r.username)}>
                                    <strong>{r.username}</strong>
                                </Link>
                            </span>
                            <span className={styles.claims}>
                                says{' '}
                                <a
                                    href={srcProfileHref(r.srcUsername)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {r.srcUsername}
                                </a>{' '}
                                on speedrun.com is them.
                            </span>
                            {!!r.matchedRuns && (
                                <span className={styles.meta}>
                                    {r.matchedRuns.toLocaleString()} of their
                                    runs match by time.
                                </span>
                            )}
                            <span className={styles.meta}>
                                {new Date(r.createdAt).toLocaleString()}
                            </span>
                            {!isPending && (
                                <span className={styles.actions}>
                                    <button
                                        type="button"
                                        className={styles.approve}
                                        onClick={() =>
                                            decide(
                                                () =>
                                                    approveSrcIdentityRequest(
                                                        r.id,
                                                    ),
                                                `Approved ${r.username}`,
                                            )
                                        }
                                    >
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.reject}
                                        onClick={() =>
                                            decide(
                                                () =>
                                                    rejectSrcIdentityRequest(
                                                        r.id,
                                                    ),
                                                `Declined ${r.username}`,
                                            )
                                        }
                                    >
                                        Decline
                                    </button>
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
