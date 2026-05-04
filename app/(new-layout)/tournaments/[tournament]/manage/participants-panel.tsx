'use client';

import { type FormEvent, useState, useTransition } from 'react';
import type {
    ParticipantStatus,
    Tournament,
} from '../../../../../types/tournament.types';
import {
    removeParticipantAction,
    setParticipantStatusAction,
} from '../../actions/participants.actions';
import {
    FormSection,
    formStyles as styles,
} from '../../components/form-primitives';

export function ParticipantsPanel({ tournament }: { tournament: Tournament }) {
    const [eligible, setEligible] = useState<string[]>(
        tournament.eligibleUsers ?? [],
    );
    const [banned, setBanned] = useState<string[]>(
        tournament.ineligibleUsers ?? [],
    );
    const [error, setError] = useState<string | null>(null);
    const [draftUser, setDraftUser] = useState('');
    const [draftStatus, setDraftStatus] =
        useState<ParticipantStatus>('eligible');
    const [isPending, startTransition] = useTransition();

    function applyTournament(t: Tournament) {
        setEligible(t.eligibleUsers ?? []);
        setBanned(t.ineligibleUsers ?? []);
    }

    function applyResult(
        res: Awaited<ReturnType<typeof setParticipantStatusAction>>,
    ) {
        if ('error' in res) {
            setError(res.error || 'Error');
            return;
        }
        applyTournament(res.ok as Tournament);
    }

    function setStatus(user: string, status: ParticipantStatus) {
        setError(null);
        startTransition(async () => {
            const res = await setParticipantStatusAction(
                tournament.name,
                user,
                status,
            );
            applyResult(res);
        });
    }

    function onAdd(e: FormEvent) {
        e.preventDefault();
        const user = draftUser.trim();
        if (!user) return;
        setStatus(user, draftStatus);
        setDraftUser('');
    }

    function onRemove(user: string) {
        if (!confirm(`Remove ${user} from this tournament's lists?`)) return;
        startTransition(async () => {
            const res = await removeParticipantAction(tournament.name, user);
            applyResult(res);
        });
    }

    const isOpen = eligible.length === 0 && banned.length === 0;

    return (
        <FormSection
            icon="◉"
            title="Participants"
            description="Decide who can submit runs. With both lists empty, the tournament is open to everyone."
        >
            {error && <div className={styles.errorAlert}>{error}</div>}

            {isOpen && (
                <div className={styles.openCallout}>
                    <span className={styles.openCalloutIcon}>●</span>
                    <span className={styles.openCalloutBody}>
                        <strong>Open tournament.</strong> No allowlist or
                        banlist set — anyone can submit runs. Add a user below
                        to start curating.
                    </span>
                </div>
            )}

            <form onSubmit={onAdd} className={styles.inlineAdd}>
                <input
                    className={styles.inlineAddInput}
                    placeholder="twitch username"
                    value={draftUser}
                    onChange={(e) => setDraftUser(e.target.value)}
                />
                <select
                    className={styles.inlineAddSelect}
                    value={draftStatus}
                    onChange={(e) =>
                        setDraftStatus(e.target.value as ParticipantStatus)
                    }
                >
                    <option value="eligible">Eligible</option>
                    <option value="banned">Banned</option>
                </select>
                <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isPending || !draftUser.trim()}
                >
                    Apply
                </button>
            </form>

            <div className={styles.subSectionTitle}>
                Eligible
                <span className={styles.subSectionCount}>
                    {eligible.length}
                </span>
            </div>
            {eligible.length === 0 ? (
                <div className={styles.emptyState}>
                    No explicit allowlist. Add a user to switch this tournament
                    from "open" to "invite-only".
                </div>
            ) : (
                <div className={styles.peopleList}>
                    {eligible.map((u) => (
                        <div key={u} className={styles.personRow}>
                            <span className={styles.personName}>{u}</span>
                            <div className={styles.personActions}>
                                <button
                                    type="button"
                                    className={`${styles.miniButton} ${styles.miniButtonWarning}`}
                                    disabled={isPending}
                                    onClick={() => setStatus(u, 'banned')}
                                >
                                    Ban
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.miniButton} ${styles.miniButtonDanger}`}
                                    disabled={isPending}
                                    onClick={() => onRemove(u)}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.subSectionTitle}>
                Banned
                <span className={styles.subSectionCount}>{banned.length}</span>
            </div>
            {banned.length === 0 ? (
                <div className={styles.emptyState}>No banned users.</div>
            ) : (
                <div className={styles.peopleList}>
                    {banned.map((u) => (
                        <div key={u} className={styles.personRow}>
                            <span className={styles.personName}>{u}</span>
                            <div className={styles.personActions}>
                                <button
                                    type="button"
                                    className={`${styles.miniButton} ${styles.miniButtonSuccess}`}
                                    disabled={isPending}
                                    onClick={() => setStatus(u, 'eligible')}
                                >
                                    Unban
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.miniButton} ${styles.miniButtonDanger}`}
                                    disabled={isPending}
                                    onClick={() => onRemove(u)}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </FormSection>
    );
}
