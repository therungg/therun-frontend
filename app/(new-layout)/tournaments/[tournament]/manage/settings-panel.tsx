'use client';

import { useState, useTransition } from 'react';
import { Button, Form } from 'react-bootstrap';
import { canDeleteTournament } from '~src/lib/tournament-permissions';
import type { User } from '../../../../../types/session.types';
import type { Tournament } from '../../../../../types/tournament.types';
import { deleteTournamentAction } from '../../actions/delete-tournament.action';
import { updateTournamentAction } from '../../actions/update-tournament.action';

export function SettingsPanel({
    tournament,
    user,
}: {
    tournament: Tournament;
    user: User;
}) {
    const [error, setError] = useState<string | null>(null);
    const [okMsg, setOkMsg] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    async function onSubmit(form: FormData) {
        setError(null);
        setOkMsg(null);
        const patch: Partial<Tournament> = {
            description: (form.get('description') as string) || undefined,
            shortName: (form.get('shortName') as string) || undefined,
            startDate: form.get('startDate') as string,
            endDate: form.get('endDate') as string,
            url: (form.get('url') as string) || undefined,
            logoUrl: (form.get('logoUrl') as string) || undefined,
            organizer: (form.get('organizer') as string) || undefined,
            gameTime: form.get('gameTime') === 'on',
        };
        startTransition(async () => {
            const res = await updateTournamentAction(tournament.name, patch);
            if (res && 'error' in res) {
                setError(res.errors?.join(', ') || res.error || null);
            } else {
                setOkMsg('Saved.');
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

    return (
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            {okMsg && <div className="alert alert-success">{okMsg}</div>}
            <Form action={onSubmit}>
                <Form.Group className="mb-3">
                    <Form.Label>Short name</Form.Label>
                    <Form.Control
                        name="shortName"
                        defaultValue={tournament.shortName ?? ''}
                    />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={4}
                        name="description"
                        defaultValue={tournament.description ?? ''}
                    />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Start date</Form.Label>
                    <Form.Control
                        name="startDate"
                        defaultValue={tournament.startDate}
                    />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>End date</Form.Label>
                    <Form.Control
                        name="endDate"
                        defaultValue={tournament.endDate}
                    />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>URL</Form.Label>
                    <Form.Control
                        name="url"
                        defaultValue={tournament.url ?? ''}
                    />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Logo URL</Form.Label>
                    <Form.Control
                        name="logoUrl"
                        defaultValue={tournament.logoUrl ?? ''}
                    />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Organizer</Form.Label>
                    <Form.Control
                        name="organizer"
                        defaultValue={tournament.organizer ?? ''}
                    />
                </Form.Group>
                <Form.Check
                    type="checkbox"
                    name="gameTime"
                    label="Use game time"
                    defaultChecked={!!tournament.gameTime}
                    className="mb-3"
                />
                <Button type="submit" disabled={isPending}>
                    Save
                </Button>
            </Form>

            {canDeleteTournament(user) && (
                <div className="mt-4 border-top pt-3">
                    <h4>Danger zone</h4>
                    <Button
                        variant="danger"
                        onClick={onDelete}
                        disabled={isPending}
                    >
                        Delete tournament
                    </Button>
                </div>
            )}
        </div>
    );
}
