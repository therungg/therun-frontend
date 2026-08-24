'use client';

import { FormEvent, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { listGameModerators } from '~src/lib/game-moderators';
import type { GameSearchResult } from '~src/lib/game-search';
import { searchGames } from '~src/lib/game-search';
import type {
    BoardModRole,
    GameModerator,
} from '../../../../../types/board-claims.types';
import type { RoleAssignment } from '../../../../../types/role-assignments.types';
import {
    addGameModeratorAction,
    removeGameModeratorAction,
} from '../../../games-v2/[game]/setup/actions/manage-moderators.action';
import styles from '../../admin.module.scss';
import { assignGlobalAdminAction } from '../../role-assignments/actions/assign-global-admin.action';
import { revokeRoleAssignmentAction } from '../../role-assignments/actions/revoke-role-assignment.action';

interface SiteAdmin {
    id: number;
    username: string;
}

interface GlobalAdminRow {
    assignmentId: number;
    userId: number;
    username?: string;
}

interface Props {
    siteAdmins: SiteAdmin[];
    globalAdmins: RoleAssignment[];
}

export const RoleTeamClient = ({ siteAdmins, globalAdmins }: Props) => {
    return (
        <div className={styles.pageWide}>
            <h2 className={styles.pageTitle}>Leaderboard role team</h2>
            <p
                className={styles.pageSubtitle}
                style={{ marginBottom: '1.5rem' }}
            >
                Manage who administers and moderates the boards. Site admins are
                managed separately and shown here for reference only.
            </p>

            <SiteAdminsSection admins={siteAdmins} />
            <GlobalAdminsSection
                initial={globalAdmins.map((a) => ({
                    assignmentId: a.id,
                    userId: a.userId,
                }))}
            />
            <GameTeamSection />
        </div>
    );
};

// -- Section 1: site admins (read-only) --------------------------------------

const SiteAdminsSection = ({ admins }: { admins: SiteAdmin[] }) => (
    <div
        className={styles.panel}
        data-tier="site-admins"
        style={{ marginBottom: '1.5rem' }}
    >
        <div className={styles.panelHeader}>
            <h4 className={styles.panelTitle}>
                Site admins <span className={styles.badgeMuted}>read-only</span>
            </h4>
            <span className={styles.panelCount}>{admins.length}</span>
        </div>
        <div className={styles.panelBody}>
            <p className={styles.pageSubtitle} style={{ marginBottom: '1rem' }}>
                Full-site superusers. Managed elsewhere &mdash; not grantable
                here.
            </p>
            {admins.length === 0 ? (
                <span className={styles.noData}>No site admins.</span>
            ) : (
                <div>
                    {admins.map((a) => (
                        <span
                            key={a.id}
                            className={styles.badge}
                            style={{ marginRight: '0.5rem' }}
                        >
                            {a.username}
                        </span>
                    ))}
                </div>
            )}
        </div>
    </div>
);

// -- Section 2: global board admins ------------------------------------------

const GlobalAdminsSection = ({ initial }: { initial: GlobalAdminRow[] }) => {
    const [rows, setRows] = useState<GlobalAdminRow[]>(initial);
    const [username, setUsername] = useState('');
    const [isSubmitting, startSubmit] = useTransition();
    const [isRevoking, startRevoke] = useTransition();

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const value = username.trim();
        if (!value) return;
        startSubmit(async () => {
            try {
                const res = await assignGlobalAdminAction(value);
                setRows((prev) => [
                    ...prev,
                    {
                        assignmentId: res.id,
                        userId: res.userId,
                        username: res.username,
                    },
                ]);
                toast.success(`Granted global-admin to ${res.username}`);
                setUsername('');
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : 'Failed to grant global-admin',
                );
            }
        });
    };

    const handleRevoke = (row: GlobalAdminRow) => {
        if (
            !confirm(
                `Revoke global-admin from ${row.username ?? `user #${row.userId}`}?`,
            )
        ) {
            return;
        }
        startRevoke(async () => {
            try {
                await revokeRoleAssignmentAction(row.assignmentId);
                setRows((prev) =>
                    prev.filter((r) => r.assignmentId !== row.assignmentId),
                );
                toast.success('Global-admin revoked');
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : 'Failed to revoke',
                );
            }
        });
    };

    return (
        <div
            className={styles.panel}
            data-tier="global-admins"
            style={{ marginBottom: '1.5rem' }}
        >
            <div className={styles.panelHeader}>
                <h4 className={styles.panelTitle}>Global board admins</h4>
                <span className={styles.panelCount}>{rows.length}</span>
            </div>
            <div className={styles.panelBody}>
                <p
                    className={styles.pageSubtitle}
                    style={{ marginBottom: '1rem' }}
                >
                    Site-wide authority over every series, game, and category (
                    <code>global-admin</code>).
                </p>
                <form
                    onSubmit={handleSubmit}
                    className={styles.searchGroup}
                    style={{ marginBottom: '1rem' }}
                >
                    <input
                        type="text"
                        className={styles.formInput}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Twitch username"
                    />
                    <button
                        type="submit"
                        className={styles.btnPrimary}
                        disabled={isSubmitting || !username.trim()}
                    >
                        {isSubmitting ? 'Granting…' : 'Grant global-admin'}
                    </button>
                </form>
                {rows.length === 0 ? (
                    <span className={styles.noData}>
                        No global board admins yet.
                    </span>
                ) : (
                    <table className={styles.table}>
                        <thead className={styles.tableHeader}>
                            <tr>
                                <th>User</th>
                                <th>Assignment</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody className={styles.tableBody}>
                            {rows.map((r) => (
                                <tr key={r.assignmentId}>
                                    <td>{r.username ?? `user #${r.userId}`}</td>
                                    <td>#{r.assignmentId}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className={styles.btnDanger}
                                            disabled={isRevoking}
                                            onClick={() => handleRevoke(r)}
                                        >
                                            Revoke
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

// -- Section 3: per-game team ------------------------------------------------

const GameTeamSection = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GameSearchResult[]>([]);
    const [selected, setSelected] = useState<GameSearchResult | null>(null);
    const [mods, setMods] = useState<GameModerator[]>([]);
    const [isSearching, startSearch] = useTransition();
    const [isLoading, startLoad] = useTransition();

    const runSearch = (e: FormEvent) => {
        e.preventDefault();
        const q = query.trim();
        if (q.length < 2) return;
        startSearch(async () => {
            try {
                setResults(await searchGames(q));
            } catch {
                setResults([]);
            }
        });
    };

    const pickGame = (game: GameSearchResult) => {
        setSelected(game);
        setResults([]);
        setQuery(game.display);
        startLoad(async () => {
            try {
                setMods(await listGameModerators(game.id));
            } catch {
                setMods([]);
            }
        });
    };

    return (
        <div className={styles.panel} data-tier="game-team">
            <div className={styles.panelHeader}>
                <h4 className={styles.panelTitle}>Game team</h4>
            </div>
            <div className={styles.panelBody}>
                <p
                    className={styles.pageSubtitle}
                    style={{ marginBottom: '1rem' }}
                >
                    Per-game admins (<code>game-admin</code>) and moderators (
                    <code>game-mod</code>). Pick a game to manage its team.
                </p>
                <form
                    onSubmit={runSearch}
                    className={styles.searchGroup}
                    style={{ marginBottom: '1rem' }}
                >
                    <input
                        type="text"
                        className={styles.formInput}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search game…"
                    />
                    <button
                        type="submit"
                        className={styles.btnOutline}
                        disabled={isSearching || query.trim().length < 2}
                    >
                        {isSearching ? 'Searching…' : 'Search'}
                    </button>
                </form>

                {results.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                        {results.map((g) => (
                            <button
                                key={g.id}
                                type="button"
                                className={styles.btnClear}
                                style={{
                                    display: 'block',
                                    textAlign: 'left',
                                    width: '100%',
                                }}
                                onClick={() => pickGame(g)}
                            >
                                {g.display}
                            </button>
                        ))}
                    </div>
                )}

                {selected && (
                    <GameModerators
                        key={selected.id}
                        game={selected}
                        moderators={mods}
                        loading={isLoading}
                        onChange={setMods}
                    />
                )}
            </div>
        </div>
    );
};

const GameModerators = ({
    game,
    moderators,
    loading,
    onChange,
}: {
    game: GameSearchResult;
    moderators: GameModerator[];
    loading: boolean;
    onChange: (mods: GameModerator[]) => void;
}) => {
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<BoardModRole>('game-mod');
    const [isPending, startPending] = useTransition();

    const add = (e: FormEvent) => {
        e.preventDefault();
        const value = username.trim();
        if (!value) return;
        startPending(async () => {
            const res = await addGameModeratorAction({
                gameSlug: game.game,
                gameId: game.id,
                username: value,
                role,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            onChange([
                ...moderators,
                {
                    assignmentId: res.result.assignmentId,
                    userId: 0,
                    username: res.result.username,
                    role,
                    createdAt: new Date().toISOString(),
                },
            ]);
            toast.success(`Added ${res.result.username} as ${role}`);
            setUsername('');
        });
    };

    const remove = (mod: GameModerator) => {
        if (
            !confirm(
                `Remove ${mod.username} (${mod.role}) from ${game.display}?`,
            )
        ) {
            return;
        }
        startPending(async () => {
            const res = await removeGameModeratorAction({
                gameSlug: game.game,
                gameId: game.id,
                assignmentId: mod.assignmentId,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            onChange(
                moderators.filter((m) => m.assignmentId !== mod.assignmentId),
            );
            toast.success('Removed');
        });
    };

    return (
        <div>
            <h5
                className={styles.panelTitle}
                style={{ marginBottom: '0.75rem' }}
            >
                {game.display}
            </h5>
            <form
                onSubmit={add}
                className={styles.searchGroup}
                style={{ marginBottom: '1rem' }}
            >
                <input
                    type="text"
                    className={styles.formInput}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Twitch username"
                />
                <select
                    className={styles.select}
                    value={role}
                    onChange={(e) => setRole(e.target.value as BoardModRole)}
                >
                    <option value="game-mod">game-mod</option>
                    <option value="game-admin">game-admin</option>
                </select>
                <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={isPending || !username.trim()}
                >
                    Add
                </button>
            </form>

            {loading ? (
                <span className={styles.noData}>Loading…</span>
            ) : moderators.length === 0 ? (
                <span className={styles.noData}>No game team yet.</span>
            ) : (
                <table className={styles.table}>
                    <thead className={styles.tableHeader}>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody className={styles.tableBody}>
                        {moderators.map((m) => (
                            <tr key={m.assignmentId}>
                                <td>{m.username}</td>
                                <td>
                                    <span className={styles.badge}>
                                        {m.role}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className={styles.btnDanger}
                                        disabled={isPending}
                                        onClick={() => remove(m)}
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};
