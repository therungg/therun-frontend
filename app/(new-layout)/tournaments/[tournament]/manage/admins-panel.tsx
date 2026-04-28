'use client';

import { useState, useTransition } from 'react';
import { Button, Form, Table } from 'react-bootstrap';
import type { Tournament } from '../../../../../types/tournament.types';
import {
    addAdminAction,
    removeAdminAction,
} from '../../actions/admins.actions';

export function AdminsPanel({ tournament }: { tournament: Tournament }) {
    const [admins, setAdmins] = useState<string[]>(tournament.admins ?? []);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function applyResult(res: Awaited<ReturnType<typeof addAdminAction>>) {
        if ('error' in res) {
            setError(res.error || 'Error');
            return;
        }
        const t = res.ok as Tournament;
        if (t && Array.isArray(t.admins)) setAdmins(t.admins);
    }

    async function onAdd(form: FormData) {
        setError(null);
        const user = ((form.get('user') as string) ?? '').trim();
        if (!user) return;
        startTransition(async () => {
            const res = await addAdminAction(tournament.name, user);
            applyResult(res);
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
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            <Form action={onAdd} className="mb-3 d-flex gap-2">
                <Form.Control name="user" placeholder="twitch username" />
                <Button type="submit" disabled={isPending}>
                    Add admin
                </Button>
            </Form>
            <Table responsive striped bordered hover>
                <thead>
                    <tr>
                        <th>User</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {admins.map((a) => (
                        <tr key={a}>
                            <td>{a}</td>
                            <td>
                                <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => onRemove(a)}
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
