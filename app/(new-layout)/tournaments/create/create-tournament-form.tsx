'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { createTournamentAction } from '../actions/create-tournament.action';
import { formStyles as styles } from '../components/form-primitives';
import {
    emptyFormState,
    TournamentFormFields,
    type TournamentFormState,
} from '../components/tournament-form-fields';

export function CreateTournamentForm() {
    const [error, setError] = useState<string | null>(null);
    const [state, setState] = useState<TournamentFormState>(emptyFormState);
    const [isPending, startTransition] = useTransition();

    function set<K extends keyof TournamentFormState>(
        key: K,
        value: TournamentFormState[K],
    ) {
        setState((prev) => ({ ...prev, [key]: value }));
    }

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const minTime = state.minimumTimeSeconds.trim();
        const minTimeNum = minTime ? Number(minTime) : undefined;
        if (minTime && (Number.isNaN(minTimeNum) || minTimeNum! < 0)) {
            setError('Minimum run time must be a non-negative number.');
            return;
        }

        startTransition(async () => {
            const res = await createTournamentAction({
                name: state.name.trim(),
                shortName: state.shortName.trim() || undefined,
                description: state.description.trim(),
                heats: state.heats,
                eligibleRuns: state.eligibleRuns,
                eligibleUsers:
                    state.eligibleUsers.length > 0
                        ? state.eligibleUsers
                        : undefined,
                moderators:
                    state.moderators.length > 0 ? state.moderators : undefined,
                forceStream: state.forceStream.trim() || undefined,
                minimumTimeSeconds: minTimeNum,
                gameTime: state.gameTime || undefined,
                url: state.url.trim() || undefined,
                logoUrl: state.logoUrl.trim() || undefined,
                organizer: state.organizer.trim() || undefined,
            });
            if (res?.error) {
                setError(res.errors?.join(', ') || res.error);
            }
        });
    }

    return (
        <form className={styles.formRoot} onSubmit={onSubmit} noValidate>
            <Link href="/tournaments" className={styles.breadcrumb}>
                <span className={styles.breadcrumbArrow}>←</span>
                Back to tournaments
            </Link>
            <div className={styles.hero}>
                <span className={styles.heroEyebrow}>● New tournament</span>
                <h1 className={styles.heroTitle}>Set the stage for your LTA</h1>
                <p className={styles.heroSubtitle}>
                    Fill in the essentials below. You can fine-tune staff,
                    participants, and lifecycle controls after creation —
                    nothing is locked in.
                </p>
            </div>

            {error && <div className={styles.errorAlert}>{error}</div>}

            <TournamentFormFields state={state} set={set} mode="create" />

            <div className={styles.actions}>
                <span className={styles.actionsHint}>
                    Required fields are marked with{' '}
                    <span className={styles.required}>*</span>. Anything
                    optional can be added later.
                </span>
                <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isPending}
                >
                    {isPending ? 'Creating…' : 'Create tournament'}
                </button>
            </div>
        </form>
    );
}
