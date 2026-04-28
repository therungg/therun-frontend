'use client';

import { useState, useTransition } from 'react';
import { Button, Form, Table } from 'react-bootstrap';
import type {
    ParticipantStatus,
    Tournament,
} from '../../../../../types/tournament.types';
import {
    removeParticipantAction,
    setParticipantStatusAction,
} from '../../actions/participants.actions';

export function ParticipantsPanel({ tournament }: { tournament: Tournament }) {
    const [eligible, setEligible] = useState<string[]>(
        tournament.eligibleUsers ?? [],
    );
    const [banned, setBanned] = useState<string[]>(
        tournament.ineligibleUsers ?? [],
    );
    const [error, setError] = useState<string | null>(null);
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

    async function onAdd(form: FormData) {
        const user = ((form.get('user') as string) ?? '').trim();
        const status = form.get('status') as ParticipantStatus;
        if (!user) return;
        setStatus(user, status);
    }

    function onRemove(user: string) {
        if (!confirm(`Remove ${user} from this tournament's lists?`)) return;
        startTransition(async () => {
            const res = await removeParticipantAction(tournament.name, user);
            applyResult(res);
        });
    }

    return (
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            <Form action={onAdd} className="mb-3 d-flex gap-2 align-items-end">
                <Form.Group>
                    <Form.Label>User</Form.Label>
                    <Form.Control name="user" />
                </Form.Group>
                <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select name="status" defaultValue="eligible">
                        <option value="eligible">Eligible</option>
                        <option value="banned">Banned</option>
                    </Form.Select>
                </Form.Group>
                <Button type="submit" disabled={isPending}>
                    Apply
                </Button>
            </Form>

            <h4>Eligible ({eligible.length})</h4>
            <Table responsive striped bordered hover className="mb-4">
                <thead>
                    <tr>
                        <th>User</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {eligible.map((u) => (
                        <tr key={u}>
                            <td>{u}</td>
                            <td className="d-flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline-warning"
                                    onClick={() => setStatus(u, 'banned')}
                                    disabled={isPending}
                                >
                                    Ban
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => onRemove(u)}
                                    disabled={isPending}
                                >
                                    Remove
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <h4>Banned ({banned.length})</h4>
            <Table responsive striped bordered hover>
                <thead>
                    <tr>
                        <th>User</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {banned.map((u) => (
                        <tr key={u}>
                            <td>{u}</td>
                            <td className="d-flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline-success"
                                    onClick={() => setStatus(u, 'eligible')}
                                    disabled={isPending}
                                >
                                    Unban
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => onRemove(u)}
                                    disabled={isPending}
                                >
                                    Remove
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
}
