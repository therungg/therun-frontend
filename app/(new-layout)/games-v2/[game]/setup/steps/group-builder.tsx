'use client';

import { useState, useTransition } from 'react';
import { createGroupAction } from '~src/actions/category-group/create-group.action';
import { deleteGroupAction } from '~src/actions/category-group/delete-group.action';
import { renameGroupAction } from '~src/actions/category-group/rename-group.action';
import { setGroupDisplayModeAction } from '~src/actions/category-group/set-group-display-mode.action';
import { setGroupHiddenAction } from '~src/actions/category-group/set-group-hidden.action';
import type {
    CategoryDisplayMode,
    ResolvedGame,
    ResolvedGroup,
} from '../../../../../../types/leaderboards.types';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import styles from '../setup.module.scss';

interface Props {
    game: ResolvedGame;
    groups: ResolvedGroup[];
    /** How many *shown* categories sit in each group, for the row counts. */
    countByGroupId: Map<number, number>;
    onGroupsChange: (groups: ResolvedGroup[]) => void;
    /** Called after a delete so rows pointing at the group can be released. */
    onGroupDeleted: (groupId: number) => void;
}

/**
 * Create/rename/delete groups inline in the wizard, on the same actions the
 * console uses. Unlike the category picks around it, these commit
 * immediately — a group is a named thing other people's rows point at, and
 * deleting one needs to release those rows server-side either way.
 */
export function GroupBuilder({
    game,
    groups,
    countByGroupId,
    onGroupsChange,
    onGroupDeleted,
}: Props) {
    const [name, setName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<ResolvedGroup | null>(
        null,
    );
    const [pending, startPending] = useTransition();

    const create = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        startPending(async () => {
            setError(null);
            const res = await createGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                name: trimmed,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            onGroupsChange([
                ...groups,
                {
                    id: res.result.id,
                    name: trimmed,
                    sortOrder: (groups[groups.length - 1]?.sortOrder ?? 0) + 1,
                    hiddenByDefault: false,
                },
            ]);
            setName('');
        });
    };

    const commitRename = (group: ResolvedGroup) => {
        const trimmed = editName.trim();
        if (!trimmed || trimmed === group.name) {
            setEditingId(null);
            return;
        }
        startPending(async () => {
            setError(null);
            const res = await renameGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                groupId: group.id,
                name: trimmed,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            onGroupsChange(
                groups.map((g) =>
                    g.id === group.id ? { ...g, name: trimmed } : g,
                ),
            );
            setEditingId(null);
        });
    };

    const remove = (group: ResolvedGroup) => {
        startPending(async () => {
            setError(null);
            const res = await deleteGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                groupId: group.id,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            onGroupsChange(groups.filter((g) => g.id !== group.id));
            onGroupDeleted(group.id);
            setConfirmDelete(null);
        });
    };

    const setHidden = (group: ResolvedGroup, hiddenByDefault: boolean) => {
        // Optimistic: the preview should react on click, not after the round
        // trip. Reverted below if the server refuses.
        onGroupsChange(
            groups.map((g) =>
                g.id === group.id ? { ...g, hiddenByDefault } : g,
            ),
        );
        startPending(async () => {
            setError(null);
            const res = await setGroupHiddenAction({
                gameSlug: game.name,
                gameId: game.id,
                groupId: group.id,
                hiddenByDefault,
            });
            if ('error' in res) {
                setError(res.error);
                onGroupsChange(
                    groups.map((g) =>
                        g.id === group.id
                            ? { ...g, hiddenByDefault: !hiddenByDefault }
                            : g,
                    ),
                );
            }
        });
    };

    const setDisplayMode = (
        group: ResolvedGroup,
        displayMode: CategoryDisplayMode | null,
    ) => {
        const previous = group.displayMode ?? null;
        onGroupsChange(
            groups.map((g) => (g.id === group.id ? { ...g, displayMode } : g)),
        );
        startPending(async () => {
            setError(null);
            const res = await setGroupDisplayModeAction({
                gameSlug: game.name,
                gameId: game.id,
                groupId: group.id,
                displayMode,
            });
            if ('error' in res) {
                setError(res.error);
                onGroupsChange(
                    groups.map((g) =>
                        g.id === group.id ? { ...g, displayMode: previous } : g,
                    ),
                );
            }
        });
    };

    // Deleting an empty group is trivially undoable (make it again); deleting
    // one with categories in it silently ungroups them, so that one asks.
    const requestRemove = (group: ResolvedGroup) => {
        if ((countByGroupId.get(group.id) ?? 0) === 0) {
            remove(group);
            return;
        }
        setConfirmDelete(group);
    };

    return (
        <div className={styles.groupBuilder}>
            <div className="d-flex gap-2 flex-wrap align-items-center mb-2">
                <input
                    className="form-control form-control-sm"
                    style={{ maxWidth: '20rem' }}
                    value={name}
                    maxLength={60}
                    placeholder="e.g. Category Extensions"
                    aria-label="New group name"
                    disabled={pending}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            create();
                        }
                    }}
                />
                <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    disabled={pending || !name.trim()}
                    onClick={create}
                >
                    Add group
                </button>
            </div>

            {groups.length === 0 ? (
                <p className="text-muted small mb-0">
                    No groups yet. Common ones: Category Extensions, or one per
                    version of the game.
                </p>
            ) : (
                <ul className={styles.rows}>
                    {groups.map((g) => {
                        const count = countByGroupId.get(g.id) ?? 0;
                        return (
                            <li key={g.id} className={styles.rowItem}>
                                {editingId === g.id ? (
                                    <input
                                        className="form-control form-control-sm"
                                        style={{ maxWidth: '16rem' }}
                                        value={editName}
                                        maxLength={60}
                                        aria-label={`Rename ${g.name}`}
                                        disabled={pending}
                                        onChange={(e) =>
                                            setEditName(e.target.value)
                                        }
                                        onBlur={() => commitRename(g)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                commitRename(g);
                                            }
                                            if (e.key === 'Escape')
                                                setEditingId(null);
                                        }}
                                    />
                                ) : (
                                    <span className="fw-semibold">
                                        {g.name}
                                    </span>
                                )}
                                <span className="text-muted small">
                                    {count} shown{' '}
                                    {count === 1 ? 'category' : 'categories'}
                                </span>
                                <label className="text-muted small d-flex align-items-center gap-1 mb-0">
                                    <input
                                        type="checkbox"
                                        className="form-check-input mt-0"
                                        checked={g.hiddenByDefault ?? false}
                                        disabled={pending}
                                        onChange={(e) =>
                                            setHidden(g, e.target.checked)
                                        }
                                    />
                                    Collapsed by default
                                </label>
                                <label className="text-muted small d-flex align-items-center gap-1 mb-0">
                                    <span className="visually-hidden">
                                        Selector for {g.name}
                                    </span>
                                    <select
                                        className="form-select form-select-sm"
                                        style={{ width: 'auto' }}
                                        value={g.displayMode ?? ''}
                                        disabled={pending}
                                        onChange={(e) =>
                                            setDisplayMode(
                                                g,
                                                e.target.value === ''
                                                    ? null
                                                    : (e.target
                                                          .value as CategoryDisplayMode),
                                            )
                                        }
                                    >
                                        <option value="">Follow board</option>
                                        <option value="auto">
                                            Auto (by count)
                                        </option>
                                        <option value="pills">Pills</option>
                                        <option value="dropdown">
                                            Dropdown
                                        </option>
                                    </select>
                                </label>
                                <span className={styles.spacer} />
                                {editingId !== g.id && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-link px-1"
                                        disabled={pending}
                                        onClick={() => {
                                            setEditingId(g.id);
                                            setEditName(g.name);
                                        }}
                                    >
                                        Rename
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-sm btn-link px-1"
                                    disabled={pending}
                                    onClick={() => requestRemove(g)}
                                >
                                    Delete
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {error && <div className={`${styles.errorNote} mt-2`}>{error}</div>}

            <ConfirmDialog
                open={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => {
                    if (confirmDelete) remove(confirmDelete);
                }}
                labelledBy="setup-delete-group-title"
                title="Delete group?"
                message={
                    confirmDelete
                        ? `"${confirmDelete.name}" holds ${
                              countByGroupId.get(confirmDelete.id) ?? 0
                          } of your shown categories. They stay on the board, just ungrouped.`
                        : ''
                }
                confirmLabel="Delete group"
                pending={pending}
                error={error}
            />
        </div>
    );
}
