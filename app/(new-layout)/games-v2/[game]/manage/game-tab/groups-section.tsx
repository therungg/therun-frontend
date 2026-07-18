'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { createGroupAction } from '~src/actions/category-group/create-group.action';
import { deleteGroupAction } from '~src/actions/category-group/delete-group.action';
import { renameGroupAction } from '~src/actions/category-group/rename-group.action';
import { reorderGroupsAction } from '~src/actions/category-group/reorder-groups.action';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import styles from './groups-section.module.scss';

interface Props {
    game: ResolvedGame;
    groups: ManageGroup[];
    rows: ManageCategoryRow[];
    onGroupsChange: (groups: ManageGroup[]) => void;
    onRowGroupChange: (
        categoryId: number,
        groupId: number | null,
        groupName: string | null,
    ) => void;
}

export function GroupsSection({
    game,
    groups,
    rows,
    onGroupsChange,
    onRowGroupChange,
}: Props) {
    const [createName, setCreateName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [pending, setPending] = useState(false);
    const [dragId, setDragId] = useState<number | null>(null);
    const [_isPending, startTransition] = useTransition();
    const [confirmDeleteGroup, setConfirmDeleteGroup] =
        useState<ManageGroup | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const countByGroupId = useMemo(() => {
        const m = new Map<number, number>();
        for (const r of rows) {
            if (r.groupId != null)
                m.set(r.groupId, (m.get(r.groupId) ?? 0) + 1);
        }
        return m;
    }, [rows]);

    const submitCreate = () => {
        const name = createName.trim();
        if (!name) return;
        setPending(true);
        startTransition(async () => {
            const res = await createGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                name,
            });
            setPending(false);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            const next: ManageGroup[] = [
                ...groups,
                {
                    id: res.result.id,
                    name,
                    sortOrder: (groups[groups.length - 1]?.sortOrder ?? 0) + 1,
                },
            ];
            onGroupsChange(next);
            setCreateName('');
            toast.success(`Created group "${name}"`);
        });
    };

    const beginEdit = (g: ManageGroup) => {
        setEditingId(g.id);
        setEditName(g.name);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const submitEdit = (g: ManageGroup) => {
        const name = editName.trim();
        if (!name || name === g.name) {
            cancelEdit();
            return;
        }
        setPending(true);
        startTransition(async () => {
            const res = await renameGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                groupId: g.id,
                name,
            });
            setPending(false);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            onGroupsChange(
                groups.map((x) => (x.id === g.id ? { ...x, name } : x)),
            );
            // Reflect the new name on rows that belong to this group.
            for (const r of rows) {
                if (r.groupId === g.id) {
                    onRowGroupChange(r.id, g.id, name);
                }
            }
            cancelEdit();
            toast.success('Renamed group');
        });
    };

    const submitDelete = (g: ManageGroup) => {
        setConfirmDeleteGroup(g);
    };

    const closeConfirmDeleteGroup = () => {
        setConfirmDeleteGroup(null);
        setDeleteError(null);
    };

    const doDelete = async (g: ManageGroup) => {
        setPending(true);
        setDeleteError(null);
        const res = await deleteGroupAction({
            gameSlug: game.name,
            gameId: game.id,
            groupId: g.id,
        });
        if ('error' in res) {
            setPending(false);
            setDeleteError(res.error);
            return;
        }
        onGroupsChange(groups.filter((x) => x.id !== g.id));
        for (const r of rows) {
            if (r.groupId === g.id) {
                onRowGroupChange(r.id, null, null);
            }
        }
        toast.success(`Deleted "${g.name}"`);
        setPending(false);
        setConfirmDeleteGroup(null);
    };

    const commitReorder = (next: ManageGroup[]) => {
        const prev = groups;
        onGroupsChange(next);
        setPending(true);
        startTransition(async () => {
            const res = await reorderGroupsAction({
                gameSlug: game.name,
                gameId: game.id,
                groupIds: next.map((g) => g.id),
            });
            setPending(false);
            if ('error' in res) {
                toast.error(res.error);
                onGroupsChange(prev);
            }
        });
    };

    const moveBy = (id: number, delta: -1 | 1) => {
        const idx = groups.findIndex((g) => g.id === id);
        const target = idx + delta;
        if (idx < 0 || target < 0 || target >= groups.length) return;
        const next = groups.slice();
        const [g] = next.splice(idx, 1);
        next.splice(target, 0, g);
        commitReorder(next);
    };

    const onDragStart = (id: number) => setDragId(id);
    const onDragOver = (e: React.DragEvent, overId: number) => {
        e.preventDefault();
        if (dragId === null || dragId === overId) return;
    };
    const onDrop = (overId: number) => {
        if (dragId === null || dragId === overId) {
            setDragId(null);
            return;
        }
        const from = groups.findIndex((g) => g.id === dragId);
        const to = groups.findIndex((g) => g.id === overId);
        setDragId(null);
        if (from < 0 || to < 0) return;
        const next = groups.slice();
        const [g] = next.splice(from, 1);
        next.splice(to, 0, g);
        commitReorder(next);
    };

    return (
        <section className="mb-4">
            <h2 className="h5 mb-2">Category groups</h2>
            <p className="text-muted small mb-2">
                Organize categories on the public game page. When more than one
                group exists, the category pills are split into labeled
                sections.
            </p>

            <div className="d-flex gap-2 align-items-center mb-3">
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="New group name"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submitCreate();
                    }}
                    disabled={pending}
                    style={{ maxWidth: 280 }}
                />
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={submitCreate}
                    disabled={pending || !createName.trim()}
                >
                    Create
                </button>
            </div>

            {groups.length === 0 ? (
                <p className="text-muted small">
                    No groups yet — create one to organize categories on the
                    public page.
                </p>
            ) : (
                <ul className="list-group" style={{ maxWidth: 560 }}>
                    {groups.map((g, i) => {
                        const count = countByGroupId.get(g.id) ?? 0;
                        const isEditing = editingId === g.id;
                        return (
                            <li
                                key={g.id}
                                className={`list-group-item d-flex align-items-center gap-2 ${
                                    dragId === g.id ? 'opacity-50' : ''
                                }`}
                                draggable={!isEditing && !pending}
                                onDragStart={() => onDragStart(g.id)}
                                onDragOver={(e) => onDragOver(e, g.id)}
                                onDrop={() => onDrop(g.id)}
                                onDragEnd={() => setDragId(null)}
                            >
                                <span
                                    aria-hidden="true"
                                    title="Drag to reorder"
                                    style={{ cursor: 'grab' }}
                                >
                                    ⠿
                                </span>
                                <div
                                    className="btn-group btn-group-sm"
                                    role="group"
                                    aria-label="Reorder"
                                >
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => moveBy(g.id, -1)}
                                        disabled={pending || i === 0}
                                        aria-label="Move up"
                                    >
                                        ▲
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => moveBy(g.id, 1)}
                                        disabled={
                                            pending || i === groups.length - 1
                                        }
                                        aria-label="Move down"
                                    >
                                        ▼
                                    </button>
                                </div>

                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="form-control form-control-sm flex-grow-1"
                                        value={editName}
                                        autoFocus
                                        onChange={(e) =>
                                            setEditName(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter')
                                                submitEdit(g);
                                            else if (e.key === 'Escape')
                                                cancelEdit();
                                        }}
                                        onBlur={() => submitEdit(g)}
                                        disabled={pending}
                                    />
                                ) : (
                                    <span className="flex-grow-1">
                                        {g.name}
                                    </span>
                                )}

                                <span className="text-muted small">
                                    {count}{' '}
                                    {count === 1 ? 'category' : 'categories'}
                                </span>

                                {!isEditing && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-link"
                                        onClick={() => beginEdit(g)}
                                        disabled={pending}
                                        aria-label="Rename"
                                    >
                                        ✎
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={styles.deleteBtn}
                                    onClick={() => submitDelete(g)}
                                    disabled={pending}
                                    aria-label="Delete"
                                >
                                    🗑
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
            <ConfirmDialog
                open={confirmDeleteGroup != null}
                onClose={closeConfirmDeleteGroup}
                onConfirm={() => {
                    if (confirmDeleteGroup) doDelete(confirmDeleteGroup);
                }}
                labelledBy="delete-group-title"
                title="Delete group?"
                message={(() => {
                    if (!confirmDeleteGroup) return '';
                    const count =
                        countByGroupId.get(confirmDeleteGroup.id) ?? 0;
                    return count > 0
                        ? `Delete "${confirmDeleteGroup.name}"? Its ${count} ${count === 1 ? 'category' : 'categories'} will become ungrouped.`
                        : `Delete "${confirmDeleteGroup.name}"?`;
                })()}
                confirmLabel="Delete"
                pending={pending}
                error={deleteError}
            />
        </section>
    );
}
