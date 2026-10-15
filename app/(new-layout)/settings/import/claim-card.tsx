'use client';

import { useState } from 'react';
import type { SrcIdentitySuggestion } from 'types/src-import.types';
import {
    claimSrcIdentity,
    denySrcIdentityLink,
    dismissSrcIdentitySuggestion,
} from '~src/actions/src-identity-claim.action';
import styles from './import.module.scss';

export function ClaimCard({
    suggestion,
}: {
    suggestion: SrcIdentitySuggestion;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [claimed, setClaimed] = useState<number | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [queued, setQueued] = useState(false);
    const [denied, setDenied] = useState(false);

    if (dismissed) return null;

    const claim = async () => {
        setBusy(true);
        setError(null);
        const res = await claimSrcIdentity(suggestion.srcUserId);
        setBusy(false);
        if ('error' in res) setError(res.error);
        else if (res.queued) setQueued(true);
        else setClaimed(res.claimedRuns + res.mergedRuns);
    };

    const deny = async () => {
        setBusy(true);
        setError(null);
        const res = await denySrcIdentityLink();
        setBusy(false);
        if ('error' in res) setError(res.error);
        else setDenied(true);
    };

    const dismiss = async () => {
        setBusy(true);
        setError(null);
        const res = await dismissSrcIdentitySuggestion();
        setBusy(false);
        if ('error' in res) setError(res.error);
        else setDismissed(true);
    };

    if (claimed !== null) {
        return (
            <p className={styles.panel}>
                Claimed {claimed.toLocaleString()}{' '}
                {claimed === 1 ? 'run' : 'runs'}.
            </p>
        );
    }

    if (queued) {
        return (
            <p className={styles.panel}>
                Confirmed. Your runs are being updated, this can take a few
                minutes.
            </p>
        );
    }

    if (denied) {
        return (
            <p className={styles.panel}>
                Link removed. The runs are back under the speedrun.com name.
            </p>
        );
    }

    const n = suggestion.runs;

    if (suggestion.linked) {
        return (
            <div className={styles.panel}>
                <p className={styles.claimText}>
                    Your account is linked to {suggestion.name} on speedrun.com.{' '}
                    {n === 1
                        ? '1 run from there shows'
                        : `${n.toLocaleString()} runs from there show`}{' '}
                    under your name, with a credit to speedrun.com. Confirm to
                    make {n === 1 ? 'it your own run' : 'them your own runs'}{' '}
                    and remove the credit. Not me undoes the link.
                </p>
                {error && (
                    <div className={styles.error} role="alert">
                        {error}
                    </div>
                )}
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.primary}
                        disabled={busy}
                        onClick={claim}
                    >
                        Confirm
                    </button>
                    <button
                        type="button"
                        className={styles.pill}
                        disabled={busy}
                        onClick={deny}
                    >
                        Not me
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.panel}>
            <p className={styles.claimText}>
                {n === 1
                    ? '1 run on speedrun.com looks like yours. It was'
                    : `${n.toLocaleString()} runs on speedrun.com look like yours. They were`}{' '}
                posted by {suggestion.name}, whose speedrun.com profile links to
                your Twitch account.
            </p>
            {error && (
                <div className={styles.error} role="alert">
                    {error}
                </div>
            )}
            <div className={styles.actions}>
                <button
                    type="button"
                    className={styles.primary}
                    disabled={busy}
                    onClick={claim}
                >
                    Claim them
                </button>
                <button
                    type="button"
                    className={styles.pill}
                    disabled={busy}
                    onClick={dismiss}
                >
                    Not me
                </button>
            </div>
        </div>
    );
}
