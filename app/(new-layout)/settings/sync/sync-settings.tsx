'use client';

import { useEffect, useState, useTransition } from 'react';
import type { SrcUserSyncStatus } from 'types/src-import.types';
import {
    FormSection,
    InlineError,
    SwitchField,
} from '~app/(new-layout)/games-v2/[game]/manage/shared/form-kit';
import {
    getMySyncStatus,
    retryMySyncLookup,
    setMySyncOptOut,
} from '~src/actions/src-import.action';
import { Button } from '~src/components/Button/Button';

const POLL_MS = 5_000;
const POLL_LIMIT = 24;

function when(iso: string | null): string {
    if (!iso) return 'never';
    return new Date(iso).toLocaleString();
}

const SOCIALS_URL = 'https://www.speedrun.com/settings/socials';

/** A match is waiting or running: no account yet, no result yet. */
function isLooking(s: SrcUserSyncStatus): boolean {
    return !s.optOut && !s.identity && s.lookupResult === null;
}

function IdentityText({ status: s }: { status: SrcUserSyncStatus }) {
    if (s.identity) {
        const name = s.identity.srcUsername ?? s.identity.srcUserId;
        if (s.lookupResult === 'stale') {
            return (
                <p>
                    Linked to speedrun.com user {name}, but that account could
                    not be found on speedrun.com at the last sync. We will retry
                    in about a month.
                </p>
            );
        }
        return <p>Linked to speedrun.com user {name}.</p>;
    }
    if (s.lookupResult === 'ambiguous') {
        return (
            <p>
                We found more than one possible speedrun.com account. Link yours
                from the Import runs tab on your profile.
            </p>
        );
    }
    if (s.lookupResult === 'no-match') {
        return (
            <p>
                We couldn't find your speedrun.com account. Link your Twitch on{' '}
                <a href={SOCIALS_URL} target="_blank" rel="noreferrer">
                    speedrun.com
                </a>{' '}
                and try again.
            </p>
        );
    }
    if (isLooking(s)) return <p>Looking for your speedrun.com account.</p>;
    return <p>Not linked to a speedrun.com account.</p>;
}

export function SyncSettings({ initial }: { initial: SrcUserSyncStatus }) {
    const [status, setStatus] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const [pending, start] = useTransition();

    // While a match runs, check back until it lands on a result.
    const looking = isLooking(status) && status.lookupAttemptedAt !== null;
    useEffect(() => {
        if (!looking) return;
        // A match normally lands in seconds; stop after two minutes rather
        // than poll behind a long import holding the queue.
        let polls = 0;
        const t: ReturnType<typeof setInterval> = setInterval(async () => {
            if (++polls > POLL_LIMIT) {
                clearInterval(t);
                return;
            }
            const r = await getMySyncStatus();
            if (!('error' in r)) setStatus(r.status);
        }, POLL_MS);
        return () => clearInterval(t);
    }, [looking]);

    const onRetry = () => {
        setError(null);
        start(async () => {
            const r = await retryMySyncLookup();
            if ('error' in r) setError(r.error);
            else setStatus(r.status);
        });
    };

    const onChange = (enabled: boolean) => {
        const optOut = !enabled;
        setStatus({ ...status, optOut });
        setError(null);
        start(async () => {
            const r = await setMySyncOptOut(optOut);
            if ('error' in r) {
                setStatus({ ...status, optOut: !optOut });
                setError(r.error);
            } else {
                setStatus(r.status);
            }
        });
    };

    const job = status.lastJob;
    return (
        <>
            <FormSection title="speedrun.com">
                <SwitchField
                    id="src-sync"
                    label="Sync my runs from speedrun.com"
                    hint="Once a day we pull your runs and their verification status onto your leaderboards. Runs already imported stay if you turn this off."
                    checked={!status.optOut}
                    disabled={pending}
                    onChange={onChange}
                />
                {error && <InlineError>{error}</InlineError>}
                <IdentityText status={status} />
                {status.lookupResult === 'no-match' &&
                    !status.identity &&
                    !status.optOut && (
                        <div>
                            <Button
                                variant="secondary"
                                disabled={pending}
                                onClick={onRetry}
                            >
                                Try again
                            </Button>
                        </div>
                    )}
                <p>Last sync: {when(status.lastAt)}.</p>
                {job?.summary && (
                    <p>
                        Last run: {job.summary.added} added,{' '}
                        {job.summary.linked} linked, {job.summary.updated}{' '}
                        updated, {job.summary.vanished} no longer on
                        speedrun.com.
                    </p>
                )}
                {job?.status === 'failed' && job.error && (
                    <InlineError>Last sync failed: {job.error}</InlineError>
                )}
            </FormSection>
        </>
    );
}
