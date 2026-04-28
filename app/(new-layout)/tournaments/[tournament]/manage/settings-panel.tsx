'use client';

import { useState, useTransition } from 'react';
import { Button, Form } from 'react-bootstrap';
import { canDeleteTournament } from '~src/lib/tournament-permissions';
import type { User } from '../../../../../types/session.types';
import type {
    DateRange,
    GameCategory,
    Tournament,
} from '../../../../../types/tournament.types';
import { deleteTournamentAction } from '../../actions/delete-tournament.action';
import { updateTournamentAction } from '../../actions/update-tournament.action';
import { EligibleRunsEditor } from '../../components/eligible-runs-editor';
import { HeatsEditor } from '../../components/heats-editor';

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

    const [shortName, setShortName] = useState(tournament.shortName ?? '');
    const [description, setDescription] = useState(
        tournament.description ?? '',
    );
    const [url, setUrl] = useState(tournament.url ?? '');
    const [logoUrl, setLogoUrl] = useState(tournament.logoUrl ?? '');
    const [organizer, setOrganizer] = useState(tournament.organizer ?? '');
    const [gameTime, setGameTime] = useState(!!tournament.gameTime);
    const [heats, setHeats] = useState<DateRange[]>(
        tournament.eligiblePeriods?.length
            ? tournament.eligiblePeriods
            : [{ startDate: '', endDate: '' }],
    );
    const [eligibleRuns, setEligibleRuns] = useState<GameCategory[]>(
        tournament.eligibleRuns?.length
            ? tournament.eligibleRuns
            : [{ game: '', category: '' }],
    );

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setOkMsg(null);
        startTransition(async () => {
            const res = await updateTournamentAction(tournament.name, {
                shortName: shortName.trim() || undefined,
                description: description.trim() || undefined,
                url: url.trim() || undefined,
                logoUrl: logoUrl.trim() || undefined,
                organizer: organizer.trim() || undefined,
                gameTime,
                heats,
                eligibleRuns,
            });
            if (res && 'error' in res) {
                setError(res.errors?.join(', ') || res.error || 'Error');
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
            <Form onSubmit={onSubmit}>
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
                        rows={4}
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
                <Form.Group className="mb-3">
                    <Form.Label>URL</Form.Label>
                    <Form.Control
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Logo URL</Form.Label>
                    <Form.Control
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                    />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Organizer</Form.Label>
                    <Form.Control
                        value={organizer}
                        onChange={(e) => setOrganizer(e.target.value)}
                    />
                </Form.Group>
                <Form.Check
                    type="checkbox"
                    label="Use game time"
                    checked={gameTime}
                    onChange={(e) => setGameTime(e.target.checked)}
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
