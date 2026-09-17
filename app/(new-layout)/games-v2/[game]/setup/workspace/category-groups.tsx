'use client';

import { useState, useTransition } from 'react';
import {
    CaretDownFill,
    CaretLeftFill,
    CaretRightFill,
    CaretUpFill,
    GripVertical,
    Plus,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { assignCategoryGroupAction } from '~src/actions/category-group/assign-category-group.action';
import { createGroupAction } from '~src/actions/category-group/create-group.action';
import { deleteGroupAction } from '~src/actions/category-group/delete-group.action';
import { renameGroupAction } from '~src/actions/category-group/rename-group.action';
import { reorderGroupsAction } from '~src/actions/category-group/reorder-groups.action';
import { setGroupDisplayModeAction } from '~src/actions/category-group/set-group-display-mode.action';
import { setGroupHiddenAction } from '~src/actions/category-group/set-group-hidden.action';
import { boardsOfKind } from '~src/lib/setup/workspace';
import type {
    CategoryDisplayMode,
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
} from '../../../../../../types/leaderboards.types';
import { SegmentedControl, SwitchField } from '../../manage/shared/form-kit';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { PromptDialog } from '../../shared/prompt-dialog';
import styles from './category-groups.module.scss';
import { useBoardPatches } from './use-board-patches';

type Layout = 'flat' | 'grouped';

interface Column {
    group: ResolvedGroup | null;
    items: ResolvedCategory[];
}

export interface CategoryGroupsProps {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    /** Every group the game has; level groups are never shown here. */
    groups: ResolvedGroup[];
}

export function CategoryGroups({
    game,
    categories,
    groups: allGroups,
}: CategoryGroupsProps) {
    const [groups, setGroups] = useState<ResolvedGroup[]>(() =>
        allGroups
            .filter((g) => g.kind !== 'level')
            .sort((a, b) => a.sortOrder - b.sortOrder),
    );
    const [layout, setLayout] = useState<Layout>(() =>
        allGroups.some((g) => g.kind !== 'level') ? 'grouped' : 'flat',
    );
    const { apply, patch, reorder, reorderPending } = useBoardPatches(game);
    const [pending, startPending] = useTransition();
    const [dragId, setDragId] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);
    const [renaming, setRenaming] = useState<ResolvedGroup | null>(null);
    const [deleting, setDeleting] = useState<ResolvedGroup | null>(null);
    const [flattening, setFlattening] = useState(false);
    const [dialogError, setDialogError] = useState<string | null>(null);

    const boards = boardsOfKind(apply(categories), allGroups, 'categories');
    const groupIds = new Set(groups.map((g) => g.id));
    const columns: Column[] = [
        ...groups.map((g) => ({
            group: g,
            items: boards.filter((c) => c.groupId === g.id),
        })),
        {
            group: null,
            items: boards.filter(
                (c) => c.groupId == null || !groupIds.has(c.groupId),
            ),
        },
    ];
    const ungroupedCount = columns[columns.length - 1].items.length;
    const busy = pending || reorderPending;
    const base = { gameSlug: game.name, gameId: game.id };

    const updateGroup = (id: number, next: Partial<ResolvedGroup>) =>
        setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, ...next } : g)));

    const releaseGroup = (groupId: number) => {
        for (const c of boards) {
            if (c.groupId === groupId) patch(c.id, { groupId: null });
        }
    };

    const assign = (category: ResolvedCategory, groupId: number | null) => {
        if ((category.groupId ?? null) === groupId) return;
        const previous = {
            groupId: category.groupId ?? null,
            sortOrder: category.sortOrder,
        };
        // The backend appends a moved category to its new group.
        patch(category.id, { groupId, sortOrder: 0 });
        startPending(async () => {
            const res = await assignCategoryGroupAction({
                ...base,
                categoryId: category.id,
                groupId,
            });
            if ('error' in res) {
                toast.error(res.error);
                patch(category.id, previous);
            }
        });
    };

    const createGroup = (name: string) => {
        setDialogError(null);
        startPending(async () => {
            const res = await createGroupAction({ ...base, name });
            if ('error' in res) {
                setDialogError(res.error);
                return;
            }
            setGroups((gs) => [
                ...gs,
                {
                    id: res.result.id,
                    name,
                    sortOrder: (gs[gs.length - 1]?.sortOrder ?? 0) + 1,
                    hiddenByDefault: false,
                    displayMode: null,
                    kind: 'normal',
                    rules: null,
                },
            ]);
            setCreating(false);
        });
    };

    const renameGroup = (name: string) => {
        const group = renaming;
        if (!group) return;
        if (name === group.name) {
            setRenaming(null);
            return;
        }
        setDialogError(null);
        startPending(async () => {
            const res = await renameGroupAction({
                ...base,
                groupId: group.id,
                name,
            });
            if ('error' in res) {
                setDialogError(res.error);
                return;
            }
            updateGroup(group.id, { name });
            setRenaming(null);
        });
    };

    const deleteGroup = () => {
        const group = deleting;
        if (!group) return;
        setDialogError(null);
        startPending(async () => {
            const res = await deleteGroupAction({ ...base, groupId: group.id });
            if ('error' in res) {
                setDialogError(res.error);
                return;
            }
            setGroups((gs) => gs.filter((g) => g.id !== group.id));
            releaseGroup(group.id);
            setDeleting(null);
        });
    };

    const flatten = () => {
        setDialogError(null);
        startPending(async () => {
            for (const group of groups) {
                const res = await deleteGroupAction({
                    ...base,
                    groupId: group.id,
                });
                if ('error' in res) {
                    setDialogError(res.error);
                    return;
                }
                setGroups((gs) => gs.filter((g) => g.id !== group.id));
                releaseGroup(group.id);
            }
            setFlattening(false);
            setLayout('flat');
        });
    };

    const chooseLayout = (next: Layout) => {
        if (next === 'grouped' || groups.length === 0) {
            setLayout(next);
            return;
        }
        setDialogError(null);
        setFlattening(true);
    };

    const moveGroup = (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= groups.length) return;
        const previous = groups;
        const next = groups.slice();
        const [moved] = next.splice(index, 1);
        next.splice(target, 0, moved);
        setGroups(next);
        startPending(async () => {
            const res = await reorderGroupsAction({
                ...base,
                groupIds: next.map((g) => g.id),
            });
            if ('error' in res) {
                toast.error(res.error);
                setGroups(previous);
            }
        });
    };

    const setHidden = (group: ResolvedGroup, hiddenByDefault: boolean) => {
        const previous = group.hiddenByDefault ?? false;
        updateGroup(group.id, { hiddenByDefault });
        startPending(async () => {
            const res = await setGroupHiddenAction({
                ...base,
                groupId: group.id,
                hiddenByDefault,
            });
            if ('error' in res) {
                toast.error(res.error);
                updateGroup(group.id, { hiddenByDefault: previous });
            }
        });
    };

    const setDisplayMode = (
        group: ResolvedGroup,
        displayMode: CategoryDisplayMode,
    ) => {
        const previous = group.displayMode ?? null;
        updateGroup(group.id, { displayMode });
        startPending(async () => {
            const res = await setGroupDisplayModeAction({
                ...base,
                groupId: group.id,
                displayMode,
            });
            if ('error' in res) {
                toast.error(res.error);
                updateGroup(group.id, { displayMode: previous });
            }
        });
    };

    const dropOnCard = (column: Column, overId: number) => {
        const dragged = dragId;
        setDragId(null);
        if (dragged === null || dragged === overId) return;
        if (column.items.some((c) => c.id === dragged)) {
            reorder(
                column.items,
                dragged,
                column.items.findIndex((c) => c.id === overId),
            );
            return;
        }
        const category = boards.find((c) => c.id === dragged);
        if (category) assign(category, column.group?.id ?? null);
    };

    const dropOnColumn = (column: Column) => {
        const dragged = dragId;
        setDragId(null);
        if (dragged === null || column.items.some((c) => c.id === dragged)) {
            return;
        }
        const category = boards.find((c) => c.id === dragged);
        if (category) assign(category, column.group?.id ?? null);
    };

    if (boards.length === 0) {
        return (
            <p className={styles.note}>
                Nothing is on the board yet. Add categories in List first; they
                show up here to group.
            </p>
        );
    }

    return (
        <div className={styles.wrap}>
            <section
                className={styles.layoutPanel}
                aria-labelledby="board-layout-title"
            >
                <h3 id="board-layout-title" className={styles.panelTitle}>
                    Board layout
                </h3>
                <SegmentedControl
                    label="Layout"
                    labelHidden
                    value={layout}
                    options={[
                        { value: 'flat', label: 'Flat' },
                        { value: 'grouped', label: 'Grouped' },
                    ]}
                    disabled={busy}
                    onChange={(v) => chooseLayout(v as Layout)}
                />
                <span className={styles.panelHint}>
                    {layout === 'flat'
                        ? 'One flat list: the board shows every category in one row, in the order set in List.'
                        : 'Groups show as sections on the board, in this order.'}
                </span>
                {layout === 'grouped' && (
                    <button
                        type="button"
                        className={styles.newAction}
                        disabled={busy}
                        onClick={() => {
                            setDialogError(null);
                            setCreating(true);
                        }}
                    >
                        <Plus size={14} aria-hidden />
                        New group
                    </button>
                )}
            </section>

            {layout === 'grouped' && (
                <>
                    {groups.length > 1 && ungroupedCount > 0 && (
                        <p className={styles.warn}>
                            {ungroupedCount}{' '}
                            {ungroupedCount === 1
                                ? 'category is'
                                : 'categories are'}{' '}
                            not in a group. With more than one group, every
                            category on the board has to be in one.
                        </p>
                    )}
                    <div className={styles.board}>
                        {columns.map((column, columnIdx) => (
                            <section
                                key={column.group?.id ?? 'ungrouped'}
                                className={`${styles.column} ${
                                    column.group ? '' : styles.columnUngrouped
                                }`}
                                aria-label={column.group?.name ?? 'Ungrouped'}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => dropOnColumn(column)}
                            >
                                <header className={styles.columnHead}>
                                    <span className={styles.columnName}>
                                        {column.group?.name ?? 'Ungrouped'}
                                    </span>
                                    <span className={styles.columnCount}>
                                        {column.items.length.toLocaleString()}
                                    </span>
                                    {column.group && (
                                        <GroupHeadActions
                                            group={column.group}
                                            index={columnIdx}
                                            last={groups.length - 1}
                                            busy={busy}
                                            onMove={moveGroup}
                                            onRename={(g) => {
                                                setDialogError(null);
                                                setRenaming(g);
                                            }}
                                            onDelete={(g) => {
                                                setDialogError(null);
                                                setDeleting(g);
                                            }}
                                        />
                                    )}
                                </header>

                                {column.group && (
                                    <div className={styles.columnSettings}>
                                        <SegmentedControl
                                            label="Display"
                                            labelHidden
                                            value={
                                                column.group.displayMode ??
                                                'pills'
                                            }
                                            options={[
                                                {
                                                    value: 'auto',
                                                    label: 'Auto',
                                                },
                                                {
                                                    value: 'pills',
                                                    label: 'Pills',
                                                },
                                                {
                                                    value: 'dropdown',
                                                    label: 'Dropdown',
                                                },
                                            ]}
                                            disabled={busy}
                                            onChange={(v) =>
                                                column.group &&
                                                setDisplayMode(
                                                    column.group,
                                                    v as CategoryDisplayMode,
                                                )
                                            }
                                        />
                                        <SwitchField
                                            id={`group-${column.group.id}-hidden`}
                                            label="Hidden by default"
                                            checked={
                                                column.group.hiddenByDefault ??
                                                false
                                            }
                                            disabled={busy}
                                            onChange={(checked) =>
                                                column.group &&
                                                setHidden(column.group, checked)
                                            }
                                        />
                                    </div>
                                )}

                                {column.items.length === 0 ? (
                                    <p className={styles.columnEmpty}>
                                        {column.group
                                            ? 'Drop categories here. An empty group does not show on the board.'
                                            : 'Every category is in a group.'}
                                    </p>
                                ) : (
                                    <ul className={styles.cards}>
                                        {column.items.map((c, i) => (
                                            <li
                                                key={c.id}
                                                className={`${styles.card} ${
                                                    dragId === c.id
                                                        ? styles.cardDragging
                                                        : ''
                                                }`}
                                                draggable={!busy}
                                                onDragStart={() =>
                                                    setDragId(c.id)
                                                }
                                                onDragEnd={() =>
                                                    setDragId(null)
                                                }
                                                onDragOver={(e) =>
                                                    e.preventDefault()
                                                }
                                                onDrop={(e) => {
                                                    e.stopPropagation();
                                                    dropOnCard(column, c.id);
                                                }}
                                            >
                                                <GripVertical
                                                    size={14}
                                                    className={styles.grip}
                                                    aria-hidden
                                                />
                                                <span
                                                    className={styles.cardName}
                                                >
                                                    {c.display}
                                                </span>
                                                <span className={styles.nudge}>
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.cardStep
                                                        }
                                                        disabled={
                                                            busy || i === 0
                                                        }
                                                        onClick={() =>
                                                            reorder(
                                                                column.items,
                                                                c.id,
                                                                i - 1,
                                                            )
                                                        }
                                                        aria-label={`Move ${c.display} up`}
                                                    >
                                                        <CaretUpFill size={9} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.cardStep
                                                        }
                                                        disabled={
                                                            busy ||
                                                            i ===
                                                                column.items
                                                                    .length -
                                                                    1
                                                        }
                                                        onClick={() =>
                                                            reorder(
                                                                column.items,
                                                                c.id,
                                                                i + 1,
                                                            )
                                                        }
                                                        aria-label={`Move ${c.display} down`}
                                                    >
                                                        <CaretDownFill
                                                            size={9}
                                                        />
                                                    </button>
                                                </span>
                                                <select
                                                    className={
                                                        styles.cardSelect
                                                    }
                                                    aria-label={`Group for ${c.display}`}
                                                    value={
                                                        c.groupId != null &&
                                                        groupIds.has(c.groupId)
                                                            ? String(c.groupId)
                                                            : ''
                                                    }
                                                    disabled={busy}
                                                    onChange={(e) =>
                                                        assign(
                                                            c,
                                                            e.target.value ===
                                                                ''
                                                                ? null
                                                                : Number(
                                                                      e.target
                                                                          .value,
                                                                  ),
                                                        )
                                                    }
                                                >
                                                    <option value="">
                                                        Ungrouped
                                                    </option>
                                                    {groups.map((g) => (
                                                        <option
                                                            key={g.id}
                                                            value={g.id}
                                                        >
                                                            {g.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        ))}
                    </div>
                </>
            )}

            <PromptDialog
                open={creating}
                onClose={() => setCreating(false)}
                onSubmit={createGroup}
                labelledBy="create-group-title"
                title="New group"
                fieldLabel="Group name"
                placeholder="e.g. Category Extensions"
                minLength={1}
                submitLabel="Create group"
                pending={pending}
                error={dialogError}
            />
            <PromptDialog
                open={renaming !== null}
                onClose={() => setRenaming(null)}
                onSubmit={renameGroup}
                labelledBy="rename-group-title"
                title="Rename group"
                fieldLabel="Group name"
                initialValue={renaming?.name ?? ''}
                minLength={1}
                submitLabel="Rename"
                pending={pending}
                error={dialogError}
            />
            <ConfirmDialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={deleteGroup}
                labelledBy="delete-group-title"
                title="Delete group?"
                message={
                    deleting
                        ? `"${deleting.name}" is deleted. Its categories stay on the board, ungrouped.`
                        : ''
                }
                confirmLabel="Delete group"
                pending={pending}
                error={dialogError}
            />
            <ConfirmDialog
                open={flattening}
                onClose={() => setFlattening(false)}
                onConfirm={flatten}
                labelledBy="flatten-groups-title"
                title="Switch to one flat list?"
                message={`All ${groups.length} ${
                    groups.length === 1 ? 'group is' : 'groups are'
                } deleted. Every category stays on the board, ungrouped.`}
                confirmLabel="Delete groups"
                pending={pending}
                error={dialogError}
            />
        </div>
    );
}

function GroupHeadActions({
    group,
    index,
    last,
    busy,
    onMove,
    onRename,
    onDelete,
}: {
    group: ResolvedGroup;
    index: number;
    last: number;
    busy: boolean;
    onMove: (index: number, dir: -1 | 1) => void;
    onRename: (group: ResolvedGroup) => void;
    onDelete: (group: ResolvedGroup) => void;
}) {
    return (
        <span className={styles.headActions}>
            <button
                type="button"
                className={styles.groupStep}
                disabled={busy || index === 0}
                onClick={() => onMove(index, -1)}
                aria-label={`Move ${group.name} left`}
            >
                <CaretLeftFill size={9} />
            </button>
            <button
                type="button"
                className={styles.groupStep}
                disabled={busy || index === last}
                onClick={() => onMove(index, 1)}
                aria-label={`Move ${group.name} right`}
            >
                <CaretRightFill size={9} />
            </button>
            <button
                type="button"
                className={styles.headLink}
                disabled={busy}
                onClick={() => onRename(group)}
                aria-label={`Rename ${group.name}`}
            >
                Rename
            </button>
            <button
                type="button"
                className={`${styles.headLink} ${styles.deleteBtn}`}
                disabled={busy}
                onClick={() => onDelete(group)}
                aria-label={`Delete ${group.name}`}
            >
                Delete
            </button>
        </span>
    );
}
