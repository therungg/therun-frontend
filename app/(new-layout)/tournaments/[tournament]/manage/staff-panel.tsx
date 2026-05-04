'use client';

import { type FormEvent, useState, useTransition } from 'react';
import {
    CAPABILITIES,
    type Capability,
    type StaffEntry,
    type Tournament,
} from '../../../../../types/tournament.types';
import {
    addStaffAction,
    removeStaffAction,
    updateStaffAction,
} from '../../actions/staff.actions';
import {
    FormSection,
    formStyles as styles,
} from '../../components/form-primitives';

const LABELS: Record<Capability, string> = {
    manage_runs: 'Runs',
    manage_participants: 'Participants',
    edit_settings: 'Settings',
    manage_staff: 'Staff',
    lifecycle: 'Lifecycle',
};

export function StaffPanel({ tournament }: { tournament: Tournament }) {
    const [staff, setStaff] = useState<StaffEntry[]>(tournament.staff ?? []);
    const [error, setError] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [isPending, startTransition] = useTransition();

    function applyResult(res: Awaited<ReturnType<typeof addStaffAction>>) {
        if ('error' in res) {
            setError(res.errors?.join(', ') || res.error || 'Error');
            return;
        }
        const t = res.ok as Tournament;
        if (t && Array.isArray(t.staff)) setStaff(t.staff);
    }

    function onAdd(e: FormEvent) {
        e.preventDefault();
        setError(null);
        const user = draft.trim();
        if (!user) return;
        startTransition(async () => {
            const res = await addStaffAction(tournament.name, user, []);
            applyResult(res);
            setDraft('');
        });
    }

    function toggle(entry: StaffEntry, cap: Capability) {
        setError(null);
        const next = entry.capabilities.includes(cap)
            ? entry.capabilities.filter((c) => c !== cap)
            : [...entry.capabilities, cap];
        startTransition(async () => {
            const res = await updateStaffAction(
                tournament.name,
                entry.user,
                next,
            );
            applyResult(res);
        });
    }

    function onRemove(entry: StaffEntry) {
        if (!confirm(`Remove ${entry.user} from staff?`)) return;
        startTransition(async () => {
            const res = await removeStaffAction(tournament.name, entry.user);
            applyResult(res);
        });
    }

    return (
        <FormSection
            icon="★"
            title="Staff"
            description="Grant scoped capabilities to trusted users. Each capability gates a different management surface — toggle to add or revoke."
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
                    Add staff
                </button>
            </form>

            {staff.length === 0 ? (
                <div className={styles.emptyState}>
                    No staff yet. Add a Twitch username to start delegating.
                </div>
            ) : (
                <div className={styles.capabilityMatrix}>
                    {staff.map((s) => (
                        <div key={s.user} className={styles.capabilityRow}>
                            <div>
                                <div
                                    style={{
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        marginBottom: '0.15rem',
                                    }}
                                >
                                    {s.user}
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--bs-secondary-color)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        fontWeight: 600,
                                    }}
                                >
                                    {s.capabilities.length} capabilit
                                    {s.capabilities.length === 1 ? 'y' : 'ies'}
                                </div>
                            </div>
                            <div className={styles.capabilityChips}>
                                {CAPABILITIES.map((c) => {
                                    const active = s.capabilities.includes(c);
                                    return (
                                        <button
                                            key={c}
                                            type="button"
                                            className={`${styles.capabilityChip} ${
                                                active
                                                    ? styles.capabilityChipActive
                                                    : ''
                                            }`}
                                            disabled={isPending}
                                            onClick={() => toggle(s, c)}
                                            aria-pressed={active}
                                        >
                                            {LABELS[c]}
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    className={`${styles.miniButton} ${styles.miniButtonDanger}`}
                                    disabled={isPending}
                                    onClick={() => onRemove(s)}
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
