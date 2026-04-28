'use client';

import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { SubmitButton } from '~src/components/Button/SubmitButton';
import { createTournamentAction } from '../actions/create-tournament.action';

export function CreateTournamentForm() {
    const [error, setError] = useState<string | null>(null);

    async function action(formData: FormData) {
        const res = await createTournamentAction(formData);
        if (res?.error) setError(res.errors?.join(', ') || res.error);
    }

    return (
        <Form action={action}>
            {error && <div className="alert alert-danger">{error}</div>}
            <Form.Group className="mb-3">
                <Form.Label>Name (used in URL)</Form.Label>
                <Form.Control name="name" required />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Short name</Form.Label>
                <Form.Control name="shortName" />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control name="description" as="textarea" rows={3} />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Start date (ISO)</Form.Label>
                <Form.Control name="startDate" type="datetime-local" required />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>End date (ISO)</Form.Label>
                <Form.Control name="endDate" type="datetime-local" required />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Eligible game</Form.Label>
                <Form.Control name="game" />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Eligible category</Form.Label>
                <Form.Control name="category" />
            </Form.Group>
            <SubmitButton
                innerText="Create tournament"
                pendingText="Creating…"
            />
        </Form>
    );
}
