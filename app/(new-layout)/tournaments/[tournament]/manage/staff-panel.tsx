'use client';

import { useState, useTransition } from 'react';
import { Button, Form, Table } from 'react-bootstrap';
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
    const [isPending, startTransition] = useTransition();

    function applyTournamentResult(
        res: Awaited<ReturnType<typeof addStaffAction>>,
    ) {
        if ('error' in res) {
            setError(res.errors?.join(', ') || res.error || 'Error');
            return;
        }
        const t = res.ok as Tournament;
        if (t && Array.isArray(t.staff)) setStaff(t.staff);
    }

    async function onAdd(form: FormData) {
        setError(null);
        const user = ((form.get('user') as string) ?? '').trim();
        if (!user) return;
        startTransition(async () => {
            const res = await addStaffAction(tournament.name, user, []);
            applyTournamentResult(res);
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
            applyTournamentResult(res);
        });
    }

    function onRemove(entry: StaffEntry) {
        if (!confirm(`Remove ${entry.user} from staff?`)) return;
        startTransition(async () => {
            const res = await removeStaffAction(tournament.name, entry.user);
            applyTournamentResult(res);
        });
    }

    return (
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            <Form action={onAdd} className="mb-3 d-flex gap-2">
                <Form.Control name="user" placeholder="twitch username" />
                <Button type="submit" disabled={isPending}>
                    Add staff
                </Button>
            </Form>
            <Table responsive striped bordered hover>
                <thead>
                    <tr>
                        <th>User</th>
                        {CAPABILITIES.map((c) => (
                            <th key={c}>{LABELS[c]}</th>
                        ))}
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {staff.map((s) => (
                        <tr key={s.user}>
                            <td>{s.user}</td>
                            {CAPABILITIES.map((c) => (
                                <td key={c}>
                                    <Form.Check
                                        type="checkbox"
                                        checked={s.capabilities.includes(c)}
                                        disabled={isPending}
                                        onChange={() => toggle(s, c)}
                                    />
                                </td>
                            ))}
                            <td>
                                <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => onRemove(s)}
                                    disabled={isPending}
                                >
                                    Remove
                                </Button>
                            </td>
                        </tr>
                    ))}
                    {staff.length === 0 && (
                        <tr>
                            <td
                                colSpan={CAPABILITIES.length + 2}
                                className="text-center text-muted"
                            >
                                No staff yet.
                            </td>
                        </tr>
                    )}
                </tbody>
            </Table>
        </div>
    );
}
