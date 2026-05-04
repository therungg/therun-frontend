'use client';

import { type FormEvent, useState, useTransition } from 'react';
import type { Tournament } from '../../../../../types/tournament.types';
import {
    addAdminAction,
    removeAdminAction,
} from '../../actions/admins.actions';
import {
    FormSection,
    formStyles as styles,
} from '../../components/form-primitives';

export function AdminsPanel({ tournament }: { tournament: Tournament }) {
    const [admins, setAdmins] = useState<string[]>(tournament.admins ?? []);
    const [error, setError] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [isPending, startTransition] = useTransition();

    function applyResult(res: Awaited<ReturnType<typeof addAdminAction>>) {
        if ('error' in res) {
            setError(res.error || 'Error');
            return;
        }
        const t = res.ok as Tournament;
        if (t && Array.isArray(t.admins)) setAdmins(t.admins);
    }

    function onAdd(e: FormEvent) {
        e.preventDefault();
        setError(null);
        const user = draft.trim();
        if (!user) return;
        startTransition(async () => {
            const res = await addAdminAction(tournament.name, user);
            applyResult(res);
            setDraft('');
        });
    }

    function onRemove(user: string) {
        if (!confirm(`Remove ${user} as admin?`)) return;
        startTransition(async () => {
            const res = await removeAdminAction(tournament.name, user);
            applyResult(res);
        });
    }

    return (
        <FormSection
            icon="✦"
            title="Admins"
            description="Per-tournament admins have implicit access to every capability except managing other admins. Only global admins can edit this list."
        >
            {error && <div className={styles.errorAlert}>{error}</div>}

            <form onSubmit={onAdd} className={styles.inlineAdd}>
                <input
                    className={styles.inlineAddInput}
                    placeholder="twitch username"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                />
                <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isPending || !draft.trim()}
                >
                    Add admin
                </button>
            </form>

            {admins.length === 0 ? (
                <div className={styles.emptyState}>
                    No admins on this tournament yet.
                </div>
            ) : (
                <div className={styles.peopleList}>
                    {admins.map((a) => (
                        <div key={a} className={styles.personRow}>
                            <span className={styles.personName}>{a}</span>
                            <div className={styles.personActions}>
                                <button
                                    type="button"
                                    className={`${styles.miniButton} ${styles.miniButtonDanger}`}
                                    disabled={isPending}
                                    onClick={() => onRemove(a)}
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
