'use client';

import { useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import { userHref } from '~src/lib/user-href';
import type { SrcIdentityRequest } from '../../../../types/src-import.types';
import { RunnerAvatar } from '../../games/[game]/leaderboard/runner-avatar';
import {
    approveSrcIdentityRequest,
    rejectSrcIdentityRequest,
} from './actions/src-identity.action';
import styles from './src-identity.module.scss';

type Row = SrcIdentityRequest & { picture: string | null };

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
            <h1 className={styles.title}>SRC identity requests</h1>
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
                                as{' '}
                                <a
                                    href={srcProfileHref(r.srcUsername)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {r.srcUsername}
                                </a>{' '}
                                on speedrun.com
                            </span>
                            <span className={styles.meta}>
                                {r.runCount.toLocaleString()}{' '}
                                {r.runCount === 1 ? 'run' : 'runs'} ·{' '}
                                {new Date(r.createdAt).toLocaleString()}
                            </span>
                            {r.knownSrcUsername === null && (
                                <span className={styles.flag}>
                                    Not seen in any import
                                </span>
                            )}
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
                                                `Linked ${r.username} to ${r.srcUsername}`,
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
                                                `Rejected ${r.username}`,
                                            )
                                        }
                                    >
                                        Reject
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
