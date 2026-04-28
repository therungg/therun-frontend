'use client';

import { useState, useTransition } from 'react';
import { Button, Form } from 'react-bootstrap';
import type {
    DateRange,
    GameCategory,
} from '../../../../types/tournament.types';
import { createTournamentAction } from '../actions/create-tournament.action';
import { EligibleRunsEditor } from '../components/eligible-runs-editor';
import { HeatsEditor } from '../components/heats-editor';

export function CreateTournamentForm() {
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [description, setDescription] = useState('');
    const [heats, setHeats] = useState<DateRange[]>([
        { startDate: '', endDate: '' },
    ]);
    const [eligibleRuns, setEligibleRuns] = useState<GameCategory[]>([
        { game: '', category: '' },
    ]);
    const [isPending, startTransition] = useTransition();

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
            const res = await createTournamentAction({
                name: name.trim(),
                shortName: shortName.trim() || undefined,
                description: description.trim() || undefined,
                heats,
                eligibleRuns,
            });
            if (res?.error) {
                setError(res.errors?.join(', ') || res.error);
            }
        });
    }

    return (
        <Form onSubmit={onSubmit}>
            {error && <div className="alert alert-danger">{error}</div>}
            <Form.Group className="mb-3">
                <Form.Label>Name (used in URL)</Form.Label>
                <Form.Control
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Short name</Form.Label>
                <Form.Control
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                    as="textarea"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </Form.Group>
            <div className="mb-3">
                <HeatsEditor value={heats} onChange={setHeats} />
            </div>
            <div className="mb-3">
                <EligibleRunsEditor
                    value={eligibleRuns}
                    onChange={setEligibleRuns}
                />
            </div>
            <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating…' : 'Create tournament'}
            </Button>
        </Form>
    );
}
