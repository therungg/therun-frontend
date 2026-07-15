'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import type {
    BoardModRole,
    GameModerator,
} from '../../../../../../types/board-claims.types';
import {
    addGameModeratorAction,
    removeGameModeratorAction,
} from '../../setup/actions/manage-moderators.action';

interface Props {
    gameSlug: string;
    gameId: number;
    moderators: GameModerator[];
    pendingApplications: number;
}

export function ModeratorsPane({
    gameSlug,
    gameId,
    moderators,
    pendingApplications,
}: Props) {
    const router = useRouter();
    const [mods, setMods] = useState<GameModerator[]>(moderators);
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<BoardModRole>('game-mod');
    const [isPending, startPending] = useTransition();

    const addMod = () => {
        startPending(async () => {
            const res = await addGameModeratorAction({
                gameSlug,
                gameId,
                username,
                role,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setMods((ms) => [
                ...ms,
                {
                    assignmentId: res.result.assignmentId,
                    // Local placeholder; the server list refreshes on navigation.
                    userId: -1,
                    username: res.result.username,
                    role,
                    createdAt: new Date().toISOString(),
                },
            ]);
            setUsername('');
            toast.success(`Added ${res.result.username}`);
            router.refresh();
        });
    };

    const removeMod = (m: GameModerator) => {
        const admins = mods.filter((x) => x.role === 'game-admin');
        if (m.role === 'game-admin' && admins.length <= 1) {
            toast.error('A board needs at least one board admin.');
            return;
        }
        if (!window.confirm(`Remove ${m.username} from the mod team?`)) return;
        startPending(async () => {
            const res = await removeGameModeratorAction({
                gameSlug,
                gameId,
                assignmentId: m.assignmentId,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setMods((ms) =>
                ms.filter((x) => x.assignmentId !== m.assignmentId),
            );
            router.refresh();
        });
    };

    return (
        <section>
            <h2 className="h5">Moderators</h2>
            {pendingApplications > 0 && (
                <div className="alert alert-info py-2">
                    {pendingApplications} pending application
                    {pendingApplications === 1 ? '' : 's'} —{' '}
                    <Link href={`/games-v2/${gameSlug}/manage?pane=attention`}>
                        review in Needs attention
                    </Link>
                </div>
            )}
            <ul className="list-group mb-3">
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
                        <span className="text-muted small">
                            since {new Date(m.createdAt).toLocaleDateString()}
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
                        No moderators on record yet.
                    </li>
                )}
            </ul>
            <div className="d-flex gap-2">
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
        </section>
    );
}
