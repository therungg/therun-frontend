'use client';

import { useState, useTransition } from 'react';
import type {
    SrcIdentityEvidence,
    SrcUserSyncStatus,
} from 'types/src-import.types';
import {
    FormSection,
    InlineError,
    SwitchField,
} from '~app/(new-layout)/games-v2/[game]/manage/shared/form-kit';
import {
    confirmMySrcProposal,
    dismissMySrcProposal,
    retryMySyncLookup,
    setMySyncOptOut,
} from '~src/actions/src-import.action';
import { Button } from '~src/components/Button/Button';
import styles from './sync-settings.module.scss';

function when(iso: string | null): string {
    if (!iso) return 'never';
    return new Date(iso).toLocaleString();
}

// Same clock formatting as everywhere else a run time is shown: no leading
// hour segment under an hour, always two zero-padded fractional digits.
function time(ms: number): string {
    const total = Math.round(ms / 10) / 100;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = (total % 60).toFixed(2).padStart(5, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

// A board proposal has no run on either side — it rests on matching
// leaderboard placements, not a specific run pair.
function evidenceKey(e: SrcIdentityEvidence, i: number): string {
    if (e.srcRunId) return e.srcRunId;
    if (e.finishedRunId !== null) return `run-${e.finishedRunId}`;
    return `board-${i}`;
}

function evidenceRunLabel(e: SrcIdentityEvidence): string {
    if (e.gameName || e.categoryName) {
        return [e.gameName, e.categoryName].filter(Boolean).join(' · ');
    }
    // Board evidence never had a run to lose; a "Deleted run" label only
    // makes sense when one of the ids pointed at a run that's since gone.
    return e.finishedRunId === null && e.srcRunId === null
        ? 'Board result'
        : 'Deleted run';
}

function Proposal({
    status: s,
    pending,
    onConfirm,
    onDismiss,
}: {
    status: SrcUserSyncStatus;
    pending: boolean;
    onConfirm: () => void;
    onDismiss: () => void;
}) {
    if (!s.proposal || s.identity) return null;
    return (
        <div className={styles.proposal}>
            <p>These runs match speedrun.com user {s.proposal.srcUsername}.</p>
            <table className={styles.evidenceTable}>
                <thead>
                    <tr>
                        <th>Run</th>
                        <th>Your time</th>
                        <th>speedrun.com</th>
                    </tr>
                </thead>
                <tbody>
                    {s.proposal.evidence.map((e, i) => (
                        <tr key={evidenceKey(e, i)}>
                            <td>{evidenceRunLabel(e)}</td>
                            <td>{time(e.timeMs)}</td>
                            <td>{time(e.srcTimeMs)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className={styles.actions}>
                <Button disabled={pending} onClick={onConfirm}>
                    That's me
                </Button>
                <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={onDismiss}
                >
                    Not me
                </Button>
            </div>
        </div>
    );
}

const SOCIALS_URL = 'https://www.speedrun.com/settings/socials';

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
    if (s.proposal) {
        return <p>We may have found your speedrun.com account.</p>;
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
                We couldn't find your speedrun.com account. Add your Twitch
                account to your{' '}
                <a href={SOCIALS_URL} target="_blank" rel="noreferrer">
                    speedrun.com socials
                </a>
                , then check again.
            </p>
        );
    }
    return <p>Not linked to a speedrun.com account.</p>;
}

export function SyncSettings({ initial }: { initial: SrcUserSyncStatus }) {
    const [status, setStatus] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const [pending, start] = useTransition();

    const onRetry = () => {
        setError(null);
        start(async () => {
            const r = await retryMySyncLookup();
            if ('error' in r) setError(r.error);
            else setStatus(r.status);
        });
    };

    const onConfirm = () => {
        setError(null);
        start(async () => {
            const r = await confirmMySrcProposal();
            if ('error' in r) setError(r.error);
            else setStatus(r.status);
        });
    };

    const onDismiss = () => {
        setError(null);
        start(async () => {
            const r = await dismissMySrcProposal();
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
                <Proposal
                    status={status}
                    pending={pending}
                    onConfirm={onConfirm}
                    onDismiss={onDismiss}
                />
                {status.lookupResult === 'no-match' &&
                    !status.identity &&
                    !status.optOut && (
                        <div>
                            <Button
                                variant="secondary"
                                disabled={pending}
                                onClick={onRetry}
                            >
                                {pending
                                    ? 'Checking…'
                                    : 'I set my Twitch account on speedrun.com, check again'}
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
