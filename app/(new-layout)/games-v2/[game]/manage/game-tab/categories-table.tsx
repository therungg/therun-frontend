'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { assignCategoryGroupAction } from '~src/actions/category-group/assign-category-group.action';
import { createGroupAction } from '~src/actions/category-group/create-group.action';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import { formatCount, formatHours } from '~src/utils/format-stats';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { PromptDialog } from '../../shared/prompt-dialog';
import { fireUndoToast } from '../moderation/shared/undo-toast';
import { updateVisibilityAction } from '../visibility/actions/update-visibility.action';
import styles from './categories-table.module.scss';

type Filter = 'all' | 'active' | 'archived';

const FILTER_LABEL: Record<Filter, string> = {
    all: 'All',
    active: 'Current',
    archived: 'Archived',
};

/** Past-tense label for a Featured/Archived toggle's undo-toast message. */
function toggleLabel(field: 'isMain' | 'active', value: boolean): string {
    if (field === 'isMain') return value ? 'featured' : 'unfeatured';
    return value ? 'restored' : 'archived';
}

interface Props {
    game: ResolvedGame;
    rows: ManageCategoryRow[];
    groups: ManageGroup[];
    onRowChange: (
        categoryId: number,
        patch: { isMain?: boolean; active?: boolean },
    ) => void;
    onRowGroupChange: (
        categoryId: number,
        groupId: number | null,
        groupName: string | null,
    ) => void;
    onGroupCreated: (group: ManageGroup) => void;
    onEdit: (categoryId: number) => void;
}

export function CategoriesTable({
    game,
    rows,
    groups,
    onRowChange,
    onRowGroupChange,
    onGroupCreated,
    onEdit,
}: Props) {
    const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    const [_isPending, startTransition] = useTransition();
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkPending, setBulkPending] = useState(false);
    const [groupPrompt, setGroupPrompt] = useState<
        { kind: 'row'; row: ManageCategoryRow } | { kind: 'bulk' } | null
    >(null);
    const [groupPromptPending, setGroupPromptPending] = useState(false);
    const [groupPromptError, setGroupPromptError] = useState<string | null>(
        null,
    );

    // Clear selection whenever the visible row set changes via filter/search.
    useEffect(() => {
        setSelectedIds(new Set());
    }, [filter, query]);

    const normalized = query.trim().toLowerCase();
    const visibleRows = useMemo(() => {
        const filtered = rows.filter((r) => {
            if (filter === 'active' && !r.active) return false;
            if (filter === 'archived' && r.active) return false;
            if (!normalized) return true;
            return (
                r.display.toLowerCase().includes(normalized) ||
                (r.groupName?.toLowerCase().includes(normalized) ?? false)
            );
        });
        return filtered.sort((a, b) => {
            if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
            return b.totalRunTime - a.totalRunTime;
        });
    }, [rows, filter, normalized]);

    const setPending = (id: number, pending: boolean) => {
        setPendingIds((prev) => {
            const next = new Set(prev);
            if (pending) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    // Applies a single Featured/Archived toggle via updateVisibilityAction —
    // shared by the toggle handler below and its Undo (which just calls this
    // again with the field flipped back to its previous value).
    const applyVisibility = async (
        categoryId: number,
        field: 'isMain' | 'active',
        value: boolean,
    ) =>
        updateVisibilityAction({
            gameSlug: game.name,
            gameId: game.id,
            categoryId,
            ...(field === 'isMain' ? { isMain: value } : {}),
            ...(field === 'active' ? { active: value } : {}),
        });

    const toggle = (
        row: ManageCategoryRow,
        field: 'isMain' | 'active',
        value: boolean,
    ) => {
        const prevValue = row[field];
        setPending(row.id, true);
        onRowChange(row.id, { [field]: value });
        startTransition(async () => {
            const res = await applyVisibility(row.id, field, value);
            setPending(row.id, false);
            if ('error' in res) {
                toast.error(res.error);
                onRowChange(row.id, { [field]: prevValue });
                return;
            }
            // Round-1 UndoToast pattern (Task 18, requirement 8): Undo
            // re-applies the inverse value and, on success, reverts the row
            // in local state too.
            fireUndoToast(
                `${row.display}: ${toggleLabel(field, value)}.`,
                async () => {
                    const undoRes = await applyVisibility(
                        row.id,
                        field,
                        prevValue,
                    );
                    if ('error' in undoRes) return { error: undoRes.error };
                    onRowChange(row.id, { [field]: prevValue });
                    return { ok: true };
                },
                // No extra resync needed on undo — the undo callback above
                // already reverts the row via onRowChange.
                () => undefined,
            );
        });
    };

    const onChangeGroup = (row: ManageCategoryRow, raw: string) => {
        if (raw === '__create__') {
            setGroupPrompt({ kind: 'row', row });
            return;
        }

        const nextGroupId = raw === '' ? null : Number.parseInt(raw, 10);
        const nextGroup = nextGroupId
            ? (groups.find((g) => g.id === nextGroupId) ?? null)
            : null;
        const prevGroupId = row.groupId ?? null;
        const prevGroupName = row.groupName ?? null;

        onRowGroupChange(row.id, nextGroupId, nextGroup?.name ?? null);
        setPending(row.id, true);
        startTransition(async () => {
            const res = await assignCategoryGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                categoryId: row.id,
                groupId: nextGroupId,
            });
            setPending(row.id, false);
            if ('error' in res) {
                toast.error(res.error);
                onRowGroupChange(row.id, prevGroupId, prevGroupName);
                return;
            }
            toast.success(
                nextGroup
                    ? `${row.display} → ${nextGroup.name}`
                    : `${row.display} → Ungrouped`,
            );
        });
    };

    const toggleSelect = (id: number, checked: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const toggleSelectAllVisible = (checked: boolean) => {
        if (!checked) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds(new Set(visibleRows.map((r) => r.id)));
    };

    // Applies groupId/groupName to every currently-selected row — shared by
    // the direct bulk-move path and the "create group then move" path below.
    const applyGroupToSelected = async (
        groupId: number | null,
        groupName: string | null,
    ) => {
        const targets = rows.filter((r) => selectedIds.has(r.id));
        const before = targets.map((r) => ({
            id: r.id,
            groupId: r.groupId ?? null,
            groupName: r.groupName ?? null,
        }));
        for (const t of targets) onRowGroupChange(t.id, groupId, groupName);
        setBulkPending(true);
        const results = await Promise.all(
            targets.map((t) =>
                assignCategoryGroupAction({
                    gameSlug: game.name,
                    gameId: game.id,
                    categoryId: t.id,
                    groupId,
                }),
            ),
        );
        setBulkPending(false);
        const failed: number[] = [];
        results.forEach((res, idx) => {
            if ('error' in res) failed.push(targets[idx].id);
        });
        if (failed.length > 0) {
            // Roll back failed only.
            const lookup = new Map(before.map((b) => [b.id, b]));
            for (const id of failed) {
                const b = lookup.get(id);
                if (b) onRowGroupChange(b.id, b.groupId, b.groupName);
            }
            toast.error(
                `${failed.length} of ${targets.length} could not be moved.`,
            );
        } else {
            toast.success(`Moved ${targets.length} categories.`);
        }
        setSelectedIds(new Set());
    };

    const bulkAssign = async (raw: string) => {
        if (selectedIds.size === 0) return;
        if (raw === '__create__') {
            setGroupPrompt({ kind: 'bulk' });
            return;
        }
        if (raw === '') {
            await applyGroupToSelected(null, null);
            return;
        }
        const groupId = Number.parseInt(raw, 10);
        const groupName = groups.find((g) => g.id === groupId)?.name ?? null;
        await applyGroupToSelected(groupId, groupName);
    };

    const closeGroupPrompt = () => {
        setGroupPrompt(null);
        setGroupPromptError(null);
    };

    const submitGroupPrompt = async (name: string) => {
        if (!groupPrompt) return;
        setGroupPromptPending(true);
        setGroupPromptError(null);
        const create = await createGroupAction({
            gameSlug: game.name,
            gameId: game.id,
            name,
        });
        if ('error' in create) {
            setGroupPromptPending(false);
            setGroupPromptError(create.error);
            return;
        }
        const newGroupId = create.result.id;
        onGroupCreated({
            id: newGroupId,
            name,
            sortOrder: (groups[groups.length - 1]?.sortOrder ?? 0) + 1,
        });

        if (groupPrompt.kind === 'row') {
            const row = groupPrompt.row;
            setPending(row.id, true);
            const assign = await assignCategoryGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                categoryId: row.id,
                groupId: newGroupId,
            });
            setPending(row.id, false);
            if ('error' in assign) {
                toast.error(assign.error);
            } else {
                onRowGroupChange(row.id, newGroupId, name);
                toast.success(`Created "${name}" and moved ${row.display}`);
            }
        } else {
            await applyGroupToSelected(newGroupId, name);
        }

        setGroupPromptPending(false);
        setGroupPrompt(null);
    };

    return (
        <section className="mb-4">
            <h2 className="h5 mb-2">Categories</h2>
            <p className="text-muted small mb-2">
                Bulk-manage which categories are visible and which are featured.
                Use "Edit" to open a category for detailed settings.
            </p>

            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <input
                    type="search"
                    className="form-control form-control-sm"
                    placeholder="Search categories…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ maxWidth: 240 }}
                />
                <span className="text-muted small">Show:</span>
                {(['all', 'active', 'archived'] as Filter[]).map((f) => (
                    <button
                        key={f}
                        type="button"
                        className={`btn btn-sm ${
                            filter === f
                                ? 'btn-primary'
                                : 'btn-outline-secondary'
                        }`}
                        onClick={() => setFilter(f)}
                    >
                        {FILTER_LABEL[f]}
                    </button>
                ))}
                <span className="ms-auto text-muted small">
                    {visibleRows.length} of {rows.length}
                </span>
            </div>

            {rows.length === 0 ? (
                <p className="text-muted text-center my-4">
                    No categories yet.
                </p>
            ) : visibleRows.length === 0 ? (
                <div className="text-center my-4">
                    <p className="text-muted mb-2">No matches.</p>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                            setQuery('');
                            setFilter('all');
                        }}
                    >
                        Clear search
                    </button>
                </div>
            ) : (
                <>
                    {selectedIds.size > 0 && (
                        <div
                            className={`d-flex align-items-center gap-2 p-2 mb-2 border rounded bg-body-tertiary ${styles.selectionBar}`}
                        >
                            <strong>{selectedIds.size} selected</strong>
                            <label className="text-muted small mb-0 ms-2">
                                Move to:
                            </label>
                            <select
                                className="form-select form-select-sm"
                                defaultValue=""
                                disabled={bulkPending}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    e.currentTarget.value = '';
                                    if (v === '__noop__') return;
                                    bulkAssign(v);
                                }}
                                style={{ maxWidth: 240 }}
                            >
                                <option value="__noop__">Choose…</option>
                                <option value="">Ungrouped</option>
                                {groups.map((g) => (
                                    <option key={g.id} value={String(g.id)}>
                                        {g.name}
                                    </option>
                                ))}
                                <option value="__create__">
                                    + Create group…
                                </option>
                            </select>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary ms-auto"
                                onClick={() => setSelectedIds(new Set())}
                                disabled={bulkPending}
                            >
                                Clear
                            </button>
                        </div>
                    )}

                    <div className="table-responsive">
                        <table className="table table-sm align-middle">
                            <thead>
                                <tr>
                                    <th style={{ width: 32 }}>
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={
                                                visibleRows.length > 0 &&
                                                visibleRows.every((r) =>
                                                    selectedIds.has(r.id),
                                                )
                                            }
                                            ref={(el) => {
                                                if (!el) return;
                                                const any = visibleRows.some(
                                                    (r) =>
                                                        selectedIds.has(r.id),
                                                );
                                                const all = visibleRows.every(
                                                    (r) =>
                                                        selectedIds.has(r.id),
                                                );
                                                el.indeterminate = any && !all;
                                            }}
                                            onChange={(e) =>
                                                toggleSelectAllVisible(
                                                    e.target.checked,
                                                )
                                            }
                                            aria-label="Select all visible"
                                        />
                                    </th>
                                    <th>Category</th>
                                    <th>Group</th>
                                    <th className="text-end">Runs</th>
                                    <th className="text-end">Runners</th>
                                    <th className="text-end">Playtime</th>
                                    <th className="text-center">Featured</th>
                                    <th className="text-center">Archived</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRows.map((row) => {
                                    const isPending = pendingIds.has(row.id);
                                    return (
                                        <tr
                                            key={row.id}
                                            className={
                                                row.active ? '' : 'text-muted'
                                            }
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={selectedIds.has(
                                                        row.id,
                                                    )}
                                                    onChange={(e) =>
                                                        toggleSelect(
                                                            row.id,
                                                            e.target.checked,
                                                        )
                                                    }
                                                    aria-label={`Select ${row.display}`}
                                                />
                                            </td>
                                            <td>{row.display}</td>
                                            <td>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={
                                                        row.groupId == null
                                                            ? ''
                                                            : String(
                                                                  row.groupId,
                                                              )
                                                    }
                                                    disabled={
                                                        isPending || bulkPending
                                                    }
                                                    onChange={(e) =>
                                                        onChangeGroup(
                                                            row,
                                                            e.target.value,
                                                        )
                                                    }
                                                    style={{ minWidth: 160 }}
                                                    aria-label={`Group: ${row.display}`}
                                                >
                                                    <option value="">
                                                        Ungrouped
                                                    </option>
                                                    {groups.map((g) => (
                                                        <option
                                                            key={g.id}
                                                            value={String(g.id)}
                                                        >
                                                            {g.name}
                                                        </option>
                                                    ))}
                                                    <option value="__create__">
                                                        + Create group…
                                                    </option>
                                                </select>
                                            </td>
                                            <td className="text-end">
                                                {formatCount(
                                                    row.totalFinishedAttemptCount,
                                                )}
                                            </td>
                                            <td className="text-end">
                                                {formatCount(row.uniqueRunners)}
                                            </td>
                                            <td className="text-end">
                                                {formatHours(row.totalRunTime)}h
                                            </td>
                                            <td className="text-center">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={row.isMain}
                                                    disabled={
                                                        isPending || !row.active
                                                    }
                                                    onChange={(e) =>
                                                        toggle(
                                                            row,
                                                            'isMain',
                                                            e.target.checked,
                                                        )
                                                    }
                                                    aria-label={`Featured: ${row.display}`}
                                                />
                                            </td>
                                            <td className="text-center">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={!row.active}
                                                    disabled={isPending}
                                                    onChange={(e) =>
                                                        toggle(
                                                            row,
                                                            'active',
                                                            !e.target.checked,
                                                        )
                                                    }
                                                    aria-label={`Archived: ${row.display}`}
                                                />
                                            </td>
                                            <td className="text-end">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-link"
                                                    onClick={() =>
                                                        onEdit(row.id)
                                                    }
                                                >
                                                    Edit →
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <p className="text-muted small mb-0">
                Tip: only "featured" categories appear on the public game page.
                If no featured categories are set, the top 5 by playtime show as
                a fallback. Non-featured categories stay accessible to mods
                here. Archived categories are hidden from the public page along
                with their boards; runs are kept.
            </p>
            <PromptDialog
                open={groupPrompt != null}
                onClose={closeGroupPrompt}
                onSubmit={submitGroupPrompt}
                labelledBy="create-group-title"
                title="Create category group"
                blurb={
                    groupPrompt?.kind === 'row'
                        ? `Creates a new group and moves ${groupPrompt.row.display} into it.`
                        : `Creates a new group and moves ${selectedIds.size} selected categor${selectedIds.size === 1 ? 'y' : 'ies'} into it.`
                }
                fieldLabel="Group name"
                placeholder="e.g. Any% category extensions"
                minLength={1}
                submitLabel="Create group"
                pending={groupPromptPending}
                error={groupPromptError}
            />
        </section>
    );
}
