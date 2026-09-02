'use client';

import { useState, useTransition } from 'react';
import type { SrcUserSyncStatus } from 'types/src-import.types';
import {
    FormSection,
    InlineError,
    SwitchField,
} from '~app/(new-layout)/games-v2/[game]/manage/shared/form-kit';
import { setMySyncOptOut } from '~src/actions/src-import.action';

function when(iso: string | null): string {
    if (!iso) return 'never';
    return new Date(iso).toLocaleString();
}

function identityText(s: SrcUserSyncStatus): string {
    if (s.identity) {
        if (s.lookupResult === 'stale') {
            return `Linked to speedrun.com user ${s.identity.srcUsername ?? s.identity.srcUserId}, but that account could not be found on speedrun.com at the last sync. We will retry in about a month.`;
        }
        return `Linked to speedrun.com user ${s.identity.srcUsername ?? s.identity.srcUserId}.`;
    }
    if (s.lookupResult === 'ambiguous') {
        return 'We found more than one possible speedrun.com account. Link yours from the Import runs tab on your profile.';
    }
    if (s.lookupResult === 'no-match') {
        return 'No speedrun.com account found yet. Add your Twitch link on your speedrun.com profile, or link it from the Import runs tab.';
    }
    return 'Looking for your speedrun.com account.';
}

export function SyncSettings({ initial }: { initial: SrcUserSyncStatus }) {
    const [status, setStatus] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const [pending, start] = useTransition();

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
                <p>{identityText(status)}</p>
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
