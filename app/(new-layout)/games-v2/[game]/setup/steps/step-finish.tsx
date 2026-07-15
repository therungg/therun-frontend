'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import type { SetupStepId } from '~src/lib/setup/completeness';
import type {
    BoardModRole,
    GameModerator,
} from '../../../../../../types/board-claims.types';
import {
    addGameModeratorAction,
    removeGameModeratorAction,
} from '../actions/manage-moderators.action';
import { setGameConfiguredAction } from '../actions/set-configured.action';
import type { StepProps } from '../types';

const STEP_LABELS: Record<SetupStepId, string> = {
    welcome: 'Welcome',
    details: 'Game details',
    categories: 'Categories',
    timing: 'Timing',
    variables: 'Variables',
    rules: 'Rules',
    standards: 'Standards',
    finish: 'Finish',
};

export function StepFinish({ data }: StepProps) {
    const [mods, setMods] = useState<GameModerator[]>(data.moderators);
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<BoardModRole>('game-mod');
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startPending] = useTransition();

    const reviewSteps = data.completeness.steps.filter(
        (s) => s.step !== 'welcome' && s.step !== 'finish',
    );
    const blockers = reviewSteps.filter((s) => s.status === 'blocker');
    const warnings = reviewSteps.filter((s) => s.status === 'warning');

    const addMod = () => {
        startPending(async () => {
            setError(null);
            const res = await addGameModeratorAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                username,
                role,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setMods((ms) => [
                ...ms,
                {
                    assignmentId: res.result.assignmentId,
                    // userId is unknown here (backend resolved it by username);
                    // it's refreshed from the server list on next mount, and
                    // the list only renders username/role, so this is fine.
                    userId: -1,
                    username: res.result.username,
                    role,
                    createdAt: new Date().toISOString(),
                },
            ]);
            setUsername('');
            toast.success(`Added ${res.result.username}`);
        });
    };

    const removeMod = (m: GameModerator) => {
        const admins = mods.filter((x) => x.role === 'game-admin');
        if (m.role === 'game-admin' && admins.length <= 1) {
            toast.error('A board needs at least one board admin.');
            return;
        }
        startPending(async () => {
            const res = await removeGameModeratorAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                assignmentId: m.assignmentId,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setMods((ms) =>
                ms.filter((x) => x.assignmentId !== m.assignmentId),
            );
        });
    };

    const finish = () => {
        startPending(async () => {
            setError(null);
            const res = await setGameConfiguredAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setDone(true);
        });
    };

    if (done) {
        return (
            <section className="text-center py-5">
                <h2>Your board is live</h2>
                <p className="text-muted">
                    Nice work. Runs are on the board and your standards are
                    active — moderation curates instead of gatekeeping.
                </p>
                <div className="d-flex gap-2 justify-content-center">
                    <Link
                        href={`/games-v2/${data.game.name}`}
                        className="btn btn-primary"
                    >
                        View your board
                    </Link>
                    <Link
                        href={`/games-v2/${data.game.name}/manage`}
                        className="btn btn-outline-secondary"
                    >
                        Open the management console
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section>
            <h2 className="h4">Mod team</h2>
            <p className="text-muted">
                Don’t moderate alone — a second pair of eyes keeps the queue
                moving.
            </p>
            <ul className="list-group mb-2">
                {mods.map((m) => (
                    <li
                        key={m.assignmentId}
                        className="list-group-item d-flex align-items-center gap-2"
                    >
                        <strong>{m.username}</strong>
                        <span className="badge bg-secondary">
                            {m.role === 'game-admin'
                                ? 'board admin'
                                : 'moderator'}
                        </span>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger ms-auto"
                            disabled={isPending}
                            onClick={() => removeMod(m)}
                        >
                            Remove
                        </button>
                    </li>
                ))}
                {mods.length === 0 && (
                    <li className="list-group-item text-muted">
                        No moderators listed yet (the backend mod list may not
                        be deployed — you can still finish setup).
                    </li>
                )}
            </ul>
            <div className="d-flex gap-2 mb-4">
                <input
                    className="form-control w-auto"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Twitch username"
                />
                <select
                    className="form-select w-auto"
                    value={role}
                    onChange={(e) => setRole(e.target.value as BoardModRole)}
                >
                    <option value="game-mod">Moderator</option>
                    <option value="game-admin">Board admin</option>
                </select>
                <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={isPending || !username.trim()}
                    onClick={addMod}
                >
                    Add
                </button>
            </div>

            <h2 className="h4">Review & finish</h2>
            <ul className="list-group mb-3">
                {reviewSteps.map((s) => (
                    <li
                        key={s.step}
                        className="list-group-item d-flex align-items-center gap-2"
                    >
                        <span
                            className={
                                s.status === 'blocker'
                                    ? 'text-danger'
                                    : s.status === 'warning'
                                      ? 'text-warning'
                                      : s.status === 'done'
                                        ? 'text-success'
                                        : 'text-muted'
                            }
                        >
                            {s.status === 'done' ? '✓' : '•'}
                        </span>
                        <strong>{STEP_LABELS[s.step]}</strong>
                        <span className="text-muted small">{s.summary}</span>
                        <Link
                            href={`/games-v2/${data.game.name}/setup?step=${s.step}`}
                            className="ms-auto small"
                        >
                            edit
                        </Link>
                    </li>
                ))}
            </ul>
            {blockers.length > 0 && (
                <div className="alert alert-danger py-2">
                    Fix before finishing:{' '}
                    {blockers.map((b) => b.summary).join(' · ')}
                </div>
            )}
            {warnings.length > 0 && blockers.length === 0 && (
                <div className="alert alert-warning py-2">
                    Worth a look (won’t block you):{' '}
                    {warnings.map((w) => w.summary).join(' · ')}
                </div>
            )}
            {error && <div className="alert alert-danger">{error}</div>}
            <button
                type="button"
                className="btn btn-success"
                disabled={isPending || blockers.length > 0}
                onClick={finish}
            >
                {isPending ? 'Finishing…' : 'Finish setup'}
            </button>
        </section>
    );
}
