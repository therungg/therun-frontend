'use client';

import { useMemo, useState, useTransition } from 'react';
import {
    CaretDownFill,
    CaretUpFill,
    Collection,
    GripVertical,
    Pencil,
    Plus,
    Trash,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { createGroupAction } from '~src/actions/category-group/create-group.action';
import { deleteGroupAction } from '~src/actions/category-group/delete-group.action';
import { renameGroupAction } from '~src/actions/category-group/rename-group.action';
import { reorderGroupsAction } from '~src/actions/category-group/reorder-groups.action';
import { setGroupDisplayModeAction } from '~src/actions/category-group/set-group-display-mode.action';
import { setGroupHiddenAction } from '~src/actions/category-group/set-group-hidden.action';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type {
    CategoryDisplayMode,
    ResolvedGame,
} from '../../../../../../types/leaderboards.types';
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

    // Optimistic for the same reason displayMode below is: the checkbox
    // flips first and reverts if the write fails, because the only other
    // feedback is the band preview above redrawing a beat late.
    const setHidden = (group: ManageGroup, hiddenByDefault: boolean) => {
        const previous = group.hiddenByDefault;
        onGroupsChange(
            groups.map((x) =>
                x.id === group.id ? { ...x, hiddenByDefault } : x,
            ),
        );
        startTransition(async () => {
            const res = await setGroupHiddenAction({
                gameSlug: game.name,
                gameId: game.id,
                groupId: group.id,
                hiddenByDefault,
            });
            if ('error' in res) {
                toast.error(res.error);
                onGroupsChange(
                    groups.map((x) =>
                        x.id === group.id
                            ? { ...x, hiddenByDefault: previous }
                            : x,
                    ),
                );
            }
        });
    };

    // Optimistic for the same reason the hidden flag is: the only other
    // feedback is the band preview redrawing a beat later.
    const setDisplayMode = (
        group: ManageGroup,
        displayMode: CategoryDisplayMode | null,
    ) => {
        const previous = group.displayMode;
        onGroupsChange(
            groups.map((x) => (x.id === group.id ? { ...x, displayMode } : x)),
        );
        startTransition(async () => {
            const res = await setGroupDisplayModeAction({
                gameSlug: game.name,
                gameId: game.id,
                groupId: group.id,
                displayMode,
            });
            if ('error' in res) {
                toast.error(res.error);
                onGroupsChange(
                    groups.map((x) =>
                        x.id === group.id ? { ...x, displayMode: previous } : x,
                    ),
                );
            }
        });
    };

    // Levels are managed in the Levels menu, so keep level groups out of
    // this list. `groups` itself stays unfiltered — the mutation handlers
    // above operate on it directly so level groups are never dropped from
    // the console's group state.
    const listGroups = useMemo(
        () => groups.filter((g) => g.kind !== 'level'),
        [groups],
    );

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
                    hiddenByDefault: false,
                    displayMode: null,
                    kind: 'normal',
                    rules: null,
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
        <section>
            <div className={styles.panel}>
                <div className={styles.createRow}>
                    <input
                        type="text"
                        className={`form-control form-control-sm ${styles.createInput}`}
                        placeholder="New group name"
                        aria-label="New group name"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submitCreate();
                        }}
                        disabled={pending}
                    />
                    <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={submitCreate}
                        disabled={pending || !createName.trim()}
                    >
                        <Plus size={14} aria-hidden="true" />
                        Create group
                    </button>
                </div>

                {listGroups.length === 0 ? (
                    <div className={styles.empty}>
                        <Collection
                            size={26}
                            className={styles.emptyIcon}
                            aria-hidden="true"
                        />
                        <p className={styles.emptyTitle}>No groups yet</p>
                        <p className="mb-0">
                            Every category sits in one flat rail until you make
                            one.
                        </p>
                    </div>
                ) : (
                    <ul className={styles.list}>
                        {listGroups.map((g, i) => {
                            const count = countByGroupId.get(g.id) ?? 0;
                            const isEditing = editingId === g.id;
                            return (
                                <li
                                    key={g.id}
                                    className={`${styles.item} ${
                                        dragId === g.id
                                            ? styles.itemDragging
                                            : ''
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
                                        className={styles.grip}
                                    >
                                        <GripVertical size={14} />
                                    </span>
                                    <span className={styles.order}>
                                        <button
                                            type="button"
                                            className={styles.orderBtn}
                                            onClick={() => moveBy(g.id, -1)}
                                            disabled={pending || i === 0}
                                            aria-label={`Move ${g.name} up`}
                                        >
                                            <CaretUpFill size={9} />
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.orderBtn}
                                            onClick={() => moveBy(g.id, 1)}
                                            disabled={
                                                pending ||
                                                i === listGroups.length - 1
                                            }
                                            aria-label={`Move ${g.name} down`}
                                        >
                                            <CaretDownFill size={9} />
                                        </button>
                                    </span>

                                    <span className={styles.identity}>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                className={`form-control form-control-sm ${styles.nameInput}`}
                                                value={editName}
                                                aria-label={`Rename ${g.name}`}
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
                                            <>
                                                <span className={styles.name}>
                                                    {g.name}
                                                </span>
                                                <span className={styles.count}>
                                                    <span
                                                        className={
                                                            styles.countNum
                                                        }
                                                    >
                                                        {count}
                                                    </span>{' '}
                                                    {count === 1
                                                        ? 'category'
                                                        : 'categories'}
                                                </span>
                                            </>
                                        )}
                                    </span>

                                    <span className={styles.controls}>
                                        {/* Collapsed-by-default was settable in
                                            the wizard and nowhere else, so a
                                            board set up before the wizard
                                            existed — or edited after it — could
                                            not reach the flag at all. It is the
                                            same action either way. */}
                                        <label
                                            className={styles.toggle}
                                            title="Collapsed by default on the public page"
                                        >
                                            <input
                                                type="checkbox"
                                                className="form-check-input mt-0"
                                                checked={g.hiddenByDefault}
                                                disabled={pending}
                                                // The visible word is short so
                                                // the control row stays calm;
                                                // the accessible name says the
                                                // whole thing.
                                                aria-label="Collapsed by default"
                                                onChange={(e) =>
                                                    setHidden(
                                                        g,
                                                        e.target.checked,
                                                    )
                                                }
                                            />
                                            Collapsed
                                        </label>

                                        {/* Pills is the default and the normal
                                            answer: a per-group override earns
                                            its place only where one group
                                            genuinely differs. An unset group
                                            draws pills, so it reads as Pills. */}
                                        <select
                                            className={styles.modeSelect}
                                            value={g.displayMode ?? 'pills'}
                                            disabled={pending}
                                            aria-label={`Display for ${g.name}`}
                                            onChange={(e) =>
                                                setDisplayMode(
                                                    g,
                                                    e.target
                                                        .value as CategoryDisplayMode,
                                                )
                                            }
                                        >
                                            <option value="pills">Pills</option>
                                            <option value="auto">
                                                Auto (by count)
                                            </option>
                                            <option value="dropdown">
                                                Dropdown
                                            </option>
                                        </select>

                                        {!isEditing && (
                                            <button
                                                type="button"
                                                className={styles.iconBtn}
                                                onClick={() => beginEdit(g)}
                                                disabled={pending}
                                                aria-label={`Rename ${g.name}`}
                                            >
                                                <Pencil size={13} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className={styles.deleteBtn}
                                            onClick={() => submitDelete(g)}
                                            disabled={pending}
                                            aria-label={`Delete ${g.name}`}
                                        >
                                            <Trash size={13} />
                                        </button>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
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
