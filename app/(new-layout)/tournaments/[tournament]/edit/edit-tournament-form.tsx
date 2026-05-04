'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { canDeleteTournament } from '~src/lib/tournament-permissions';
import type { User } from '../../../../../types/session.types';
import type { Tournament } from '../../../../../types/tournament.types';
import { deleteTournamentAction } from '../../actions/delete-tournament.action';
import { updateTournamentAction } from '../../actions/update-tournament.action';
import { formStyles as styles } from '../../components/form-primitives';
import {
    TournamentFormFields,
    type TournamentFormState,
} from '../../components/tournament-form-fields';

function fromTournament(t: Tournament): TournamentFormState {
    return {
        name: t.name,
        shortName: t.shortName ?? '',
        description: t.description ?? '',
        heats: t.eligiblePeriods?.length
            ? t.eligiblePeriods
            : [{ startDate: '', endDate: '' }],
        eligibleRuns: t.eligibleRuns?.length
            ? t.eligibleRuns
            : [{ game: '', category: '' }],
        eligibleUsers: t.eligibleUsers ?? [],
        moderators: t.moderators ?? [],
        forceStream: t.forceStream ?? '',
        minimumTimeSeconds:
            t.minimumTimeSeconds !== undefined && t.minimumTimeSeconds !== null
                ? String(t.minimumTimeSeconds)
                : '',
        gameTime: !!t.gameTime,
        url: t.url ?? '',
        logoUrl: t.logoUrl ?? '',
        organizer: t.organizer ?? '',
    };
}

export function EditTournamentForm({
    tournament,
    user,
}: {
    tournament: Tournament;
    user: User;
}) {
    const tournamentHref = `/tournaments/${encodeURIComponent(tournament.name)}`;
    const [error, setError] = useState<string | null>(null);
    const [okMsg, setOkMsg] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [state, setState] = useState<TournamentFormState>(() =>
        fromTournament(tournament),
    );

    function set<K extends keyof TournamentFormState>(
        key: K,
        value: TournamentFormState[K],
    ) {
        setState((prev) => ({ ...prev, [key]: value }));
    }

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setOkMsg(null);

        const minTime = state.minimumTimeSeconds.trim();
        const minTimeNum = minTime ? Number(minTime) : undefined;
        if (minTime && (Number.isNaN(minTimeNum) || minTimeNum! < 0)) {
            setError('Minimum run time must be a non-negative number.');
            return;
        }

        startTransition(async () => {
            const res = await updateTournamentAction(tournament.name, {
                shortName: state.shortName.trim() || undefined,
                description: state.description.trim() || undefined,
                url: state.url.trim() || undefined,
                logoUrl: state.logoUrl.trim() || undefined,
                organizer: state.organizer.trim() || undefined,
                gameTime: state.gameTime,
                heats: state.heats,
                eligibleRuns: state.eligibleRuns,
                eligibleUsers:
                    state.eligibleUsers.length > 0 ? state.eligibleUsers : null,
                moderators: state.moderators,
                forceStream: state.forceStream.trim() || undefined,
                minimumTimeSeconds: minTimeNum,
            });
            if (res && 'error' in res) {
                setError(res.errors?.join(', ') || res.error || 'Error');
            } else {
                setOkMsg('Saved.');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    async function onDelete() {
        if (
            !confirm(
                `Delete tournament "${tournament.name}"? This is irreversible.`,
            )
        ) {
            return;
        }
        startTransition(async () => {
            const res = await deleteTournamentAction(tournament.name);
            if (res && 'error' in res) setError(res.error);
        });
    }

    const displayName = tournament.shortName || tournament.name;

    return (
        <form className={styles.formRoot} onSubmit={onSubmit} noValidate>
            <Link href={tournamentHref} className={styles.breadcrumb}>
                <span className={styles.breadcrumbArrow}>←</span>
                Back to {displayName}
            </Link>

            <div className={styles.hero}>
                <span className={styles.heroEyebrow}>● Editing</span>
                <h1 className={styles.heroTitle}>{displayName}</h1>
                <p className={styles.heroSubtitle}>
                    Tweak the schedule, eligibility, rules, and presentation.
                    Changes apply immediately on save — staff, participants, and
                    lifecycle controls live under{' '}
                    <Link
                        href={`${tournamentHref}/manage`}
                        style={{
                            color: 'inherit',
                            textDecoration: 'underline',
                        }}
                    >
                        Manage
                    </Link>
                    .
                </p>
            </div>

            {error && <div className={styles.errorAlert}>{error}</div>}
            {okMsg && <div className={styles.successAlert}>{okMsg}</div>}

            <TournamentFormFields state={state} set={set} mode="edit" />

            <div className={styles.actions}>
                <span className={styles.actionsHint}>
                    Required fields are marked with{' '}
                    <span className={styles.required}>*</span>. Lifecycle status
                    is not affected by saving.
                </span>
                <Link href={tournamentHref} className={styles.ghostButton}>
                    Cancel
                </Link>
                <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isPending}
                >
                    {isPending ? 'Saving…' : 'Save changes'}
                </button>
            </div>

            {canDeleteTournament(user) && (
                <div className={styles.dangerZone}>
                    <div className={styles.dangerZoneHeader}>
                        <h3 className={styles.dangerZoneTitle}>Danger zone</h3>
                    </div>
                    <p className={styles.dangerZoneBody}>
                        Deleting this tournament removes all of its data
                        permanently — runs, leaderboards, and configuration.
                        This cannot be undone.
                    </p>
                    <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={onDelete}
                        disabled={isPending}
                    >
                        Delete tournament
                    </button>
                </div>
            )}
        </form>
    );
}
