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
import { ConfirmDialog } from '../../shared/confirm-dialog';
import styles from './console.module.scss';

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
    const [confirmRemove, setConfirmRemove] = useState<GameModerator | null>(
        null,
    );
    const [removePending, setRemovePending] = useState(false);
    const [removeError, setRemoveError] = useState<string | null>(null);

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
        setConfirmRemove(m);
    };

    const closeConfirmRemove = () => {
        setConfirmRemove(null);
        setRemoveError(null);
    };

    const doRemoveMod = async (m: GameModerator) => {
        setRemovePending(true);
        setRemoveError(null);
        const res = await removeGameModeratorAction({
            gameSlug,
            gameId,
            assignmentId: m.assignmentId,
        });
        if ('error' in res) {
            setRemovePending(false);
            setRemoveError(res.error);
            return;
        }
        setMods((ms) => ms.filter((x) => x.assignmentId !== m.assignmentId));
        router.refresh();
        setRemovePending(false);
        setConfirmRemove(null);
    };

    return (
        <section className={styles.surface}>
            <div className={styles.paneHeader}>
                <h2 className={styles.paneTitle}>Moderators</h2>
                <span className={styles.paneCount}>{mods.length}</span>
            </div>
            {pendingApplications > 0 && (
                <div className={styles.noteInfo}>
                    {pendingApplications} pending application
                    {pendingApplications === 1 ? '' : 's'} —{' '}
                    <Link href={`/games-v2/${gameSlug}/manage?pane=attention`}>
                        review in Needs attention
                    </Link>
                </div>
            )}
            <div className="mb-3">
                {mods.map((m) => (
                    <div key={m.assignmentId} className={styles.modRow}>
                        <strong>{m.username}</strong>
                        <span className={styles.pill}>
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
                    </div>
                ))}
                {mods.length === 0 && (
                    <div className={`${styles.modRow} text-muted`}>
                        No moderators on record yet.
                    </div>
                )}
            </div>
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
            <ConfirmDialog
                open={confirmRemove != null}
                onClose={closeConfirmRemove}
                onConfirm={() => {
                    if (confirmRemove) doRemoveMod(confirmRemove);
                }}
                labelledBy="remove-mod-title"
                title="Remove moderator?"
                message={`Remove ${confirmRemove?.username} from the mod team? They lose all moderator permissions on this board immediately.`}
                confirmLabel="Remove"
                pending={removePending}
                error={removeError}
            />
        </section>
    );
}
