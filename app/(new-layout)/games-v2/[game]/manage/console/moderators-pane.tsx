'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { PeopleFill } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import styles from '~src/components/console-chrome/console.module.scss';
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
import kit from '../shared/form-kit.module.scss';
import pane from './moderators-pane.module.scss';

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
            <header className={styles.paneHeader}>
                <div>
                    <div className={styles.paneEyebrow}>Game</div>
                    <h2 className={styles.paneTitle}>Moderators</h2>
                </div>
                <span className={styles.paneCount}>{mods.length}</span>
            </header>
            <p className={styles.paneLede}>
                The team that verifies runs and configures this board.
            </p>
            {pendingApplications > 0 && (
                <div className={styles.noteInfo}>
                    {pendingApplications} pending application
                    {pendingApplications === 1 ? '' : 's'}.{' '}
                    <Link
                        href={`/games-v2/${encodeURIComponent(gameSlug)}/manage?pane=attention`}
                    >
                        Review in Needs attention
                    </Link>
                </div>
            )}
            {mods.length > 0 ? (
                <ul className={pane.roster}>
                    {mods.map((m) => (
                        <li key={m.assignmentId} className={pane.row}>
                            <span className={pane.avatar} aria-hidden="true">
                                {m.username.slice(0, 1).toUpperCase()}
                            </span>
                            <span className={pane.name}>{m.username}</span>
                            <span
                                className={
                                    m.role === 'game-admin'
                                        ? pane.rolePillAdmin
                                        : pane.rolePill
                                }
                            >
                                {m.role === 'game-admin'
                                    ? 'Board admin'
                                    : 'Moderator'}
                            </span>
                            <span className={pane.since}>
                                since{' '}
                                {new Date(m.createdAt).toLocaleDateString()}
                            </span>
                            <button
                                type="button"
                                className={pane.removeBtn}
                                disabled={isPending}
                                onClick={() => removeMod(m)}
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className={pane.empty}>
                    <PeopleFill
                        size={28}
                        className={pane.emptyIcon}
                        aria-hidden
                    />
                    <p className={pane.emptyTitle}>No moderators yet</p>
                    <p>Add the first one by Twitch username below.</p>
                </div>
            )}
            <div>
                <div className={pane.addLabel} id="add-moderator-label">
                    Add a moderator
                </div>
                <div
                    className={pane.addRow}
                    role="group"
                    aria-labelledby="add-moderator-label"
                >
                    <input
                        className="form-control"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Twitch username"
                        aria-label="Twitch username"
                    />
                    <select
                        className="form-select"
                        value={role}
                        onChange={(e) =>
                            setRole(e.target.value as BoardModRole)
                        }
                        aria-label="Role"
                    >
                        <option value="game-mod">Moderator</option>
                        <option value="game-admin">Board admin</option>
                    </select>
                    <button
                        type="button"
                        className={kit.saveBtn}
                        disabled={isPending || !username.trim()}
                        onClick={addMod}
                    >
                        Add
                    </button>
                </div>
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
