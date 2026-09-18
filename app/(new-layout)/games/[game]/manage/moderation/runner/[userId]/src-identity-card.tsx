'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { RunnerSrcIdentity } from '~src/lib/moderation/src-identity';
import {
    loadRunnerSrcIdentityAction,
    setRunnerSrcIdentityAction,
} from './actions/src-identity.action';
import styles from './src-identity-card.module.scss';

/** Accepts a profile link as readily as a name, since a moderator will paste one. */
const nameFrom = (input: string): string => {
    const t = input.trim();
    const m = t.match(/speedrun\.com\/(?:users\/)?([^/?#]+)/i);
    return (m ? m[1] : t).trim();
};

export function SrcIdentityCard({
    gameSlug,
    userId,
    runnerName,
}: {
    gameSlug: string;
    userId: number;
    runnerName: string;
}) {
    const [identity, setIdentity] = useState<RunnerSrcIdentity | null>(null);
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [, startLoad] = useTransition();
    const [isSaving, startSave] = useTransition();

    useEffect(() => {
        startLoad(async () => {
            const res = await loadRunnerSrcIdentityAction(gameSlug, userId);
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setIdentity(res.identity);
        });
    }, [gameSlug, userId]);

    const save = () => {
        const name = nameFrom(input);
        if (!name) return;
        startSave(async () => {
            const res = await setRunnerSrcIdentityAction(
                gameSlug,
                userId,
                name,
            );
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setError(null);
            setInput('');
            setIdentity({
                username: res.result.username,
                srcUserId: res.result.srcUserId,
                srcUsername: res.result.srcUsername,
                srcVerifiedAt: new Date().toISOString(),
                editable: false,
            });
            const claimed = res.result.claimedRuns;
            const merged = res.result.mergedRuns;
            toast.success(
                claimed || merged
                    ? `Linked. ${claimed} run${claimed === 1 ? '' : 's'} moved onto ${runnerName}${merged ? `, ${merged} merged with runs they already had` : ''}.`
                    : `Linked to ${res.result.srcUsername}.`,
            );
        });
    };

    if (!identity && !error) return null;

    return (
        <section className={styles.card}>
            <h3 className={styles.title}>speedrun.com profile</h3>
            {identity?.srcUserId ? (
                <p className={styles.linked}>
                    <a
                        href={`https://www.speedrun.com/users/${encodeURIComponent(identity.srcUsername ?? identity.srcUserId)}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {identity.srcUsername ?? identity.srcUserId}
                    </a>
                    <span className={styles.note}>
                        Changing this is an admin's call.
                    </span>
                </p>
            ) : (
                <>
                    <p className={styles.note}>
                        Naming their profile hands them every run an import
                        parked under that name, and merges the ones they already
                        have here.
                    </p>
                    <div className={styles.row}>
                        <input
                            className="form-control form-control-sm"
                            placeholder="Name or profile link"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') save();
                            }}
                        />
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={save}
                            disabled={isSaving || !input.trim()}
                        >
                            {isSaving ? 'Linking…' : 'Link'}
                        </button>
                    </div>
                </>
            )}
            {error && (
                <p className={styles.error} role="alert">
                    {error}
                </p>
            )}
        </section>
    );
}
