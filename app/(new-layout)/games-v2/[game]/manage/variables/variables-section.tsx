'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type {
    ResolvedCategory,
    VariableRow as VariableRowData,
} from '../../../../../../types/leaderboards.types';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { createVariableAction } from './actions/create-variable.action';
import { deleteVariableAction } from './actions/delete-variable.action';
import { loadVariablesAction } from './actions/load-variables.action';
import { updateVariableAction } from './actions/update-variable.action';
import { VariableForm, type VariableFormValues } from './variable-form';
import { VariableRow } from './variable-row';

type Scope = 'game' | 'category';

type FormState =
    | { open: false }
    | { open: true; mode: 'create' }
    | { open: true; mode: 'edit'; editing: VariableRowData };

interface Props {
    gameSlug: string;
    gameId: number;
    selectedCategory: ResolvedCategory | null;
}

export function VariablesSection({
    gameSlug,
    gameId,
    selectedCategory,
}: Props) {
    const [rows, setRows] = useState<VariableRowData[]>([]);
    const [reservedParams, setReservedParams] = useState<string[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [scope, setScope] = useState<Scope>('game');
    const [formState, setFormState] = useState<FormState>({ open: false });
    const [formError, setFormError] = useState<string | null>(null);
    const [isLoading, startLoadTransition] = useTransition();
    const [isSaving, startSaveTransition] = useTransition();
    const [confirmDelete, setConfirmDelete] = useState<VariableRowData | null>(
        null,
    );
    const busy = isLoading || isSaving;

    const refresh = async () => {
        const res = await loadVariablesAction({
            gameSlug,
            gameId,
            categoryId: selectedCategory?.id ?? null,
        });
        if ('error' in res) {
            setLoadError(res.error);
            setRows([]);
            setReservedParams([]);
        } else {
            setLoadError(null);
            setRows(res.result.variables);
            setReservedParams(res.result.reservedParams);
        }
    };

    useEffect(() => {
        startLoadTransition(() => refresh());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId, selectedCategory?.id]);

    const visible = (Array.isArray(rows) ? rows : [])
        .filter((r) =>
            scope === 'game'
                ? r.categoryId === null
                : selectedCategory != null &&
                  r.categoryId === selectedCategory.id,
        )
        .sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        );

    const subcategoryRows = visible.filter((r) => r.role === 'subcategory');
    const filterRows = visible.filter((r) => r.role === 'filter');

    const closeForm = () => {
        setFormState({ open: false });
        setFormError(null);
    };

    const handleSubmit = (values: VariableFormValues) => {
        setFormError(null);

        const categoryId =
            scope === 'category' ? (selectedCategory?.id ?? null) : null;

        if (formState.open && formState.mode === 'create') {
            startSaveTransition(async () => {
                const res = await createVariableAction({
                    gameSlug,
                    gameId,
                    body: {
                        categoryId,
                        name: values.name,
                        role: values.role,
                        values: values.values,
                        defaultValueIndex: values.defaultValueIndex,
                        sortOrder: values.sortOrder,
                        description: values.description,
                    },
                });
                if ('error' in res) {
                    setFormError(res.error);
                    return;
                }
                toast.success(`Created variable "${values.name}"`);
                closeForm();
                await refresh();
            });
            return;
        }

        if (formState.open && formState.mode === 'edit') {
            const editing = formState.editing;
            startSaveTransition(async () => {
                const res = await updateVariableAction({
                    gameSlug,
                    gameId,
                    body: {
                        // Upsert key is (gameId, categoryId, nameNormalized).
                        // Use the editing row's identity, NOT the form's
                        // (the name field is locked in edit mode anyway).
                        categoryId: editing.categoryId,
                        name: editing.name,
                        role: editing.role,
                        values: values.values,
                        defaultValueIndex: values.defaultValueIndex,
                        sortOrder: values.sortOrder,
                        description: values.description,
                    },
                });
                if ('error' in res) {
                    setFormError(res.error);
                    return;
                }
                toast.success(`Updated "${editing.name}"`);
                closeForm();
                await refresh();
            });
        }
    };

    const handleDelete = (row: VariableRowData) => {
        setConfirmDelete(row);
    };

    const doDelete = (row: VariableRowData) => {
        startSaveTransition(async () => {
            const res = await deleteVariableAction({
                gameSlug,
                gameId,
                categoryId: row.categoryId,
                name: row.name,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(`Deleted "${row.name}"`);
            await refresh();
        });
    };

    const swapSortOrder = async (a: VariableRowData, b: VariableRowData) => {
        const upsertSort = async (row: VariableRowData, newSort: number) =>
            updateVariableAction({
                gameSlug,
                gameId,
                body: {
                    categoryId: row.categoryId,
                    name: row.name,
                    role: row.role,
                    values: row.values,
                    defaultValueIndex: row.defaultValueIndex,
                    sortOrder: newSort,
                    description: row.description,
                },
            });

        const aRes = await upsertSort(a, b.sortOrder);
        if ('error' in aRes) {
            toast.error(aRes.error);
            return;
        }
        const bRes = await upsertSort(b, a.sortOrder);
        if ('error' in bRes) {
            toast.error(bRes.error);
        }
        await refresh();
    };

    const handleMoveUp = (row: VariableRowData) => {
        const peers = row.role === 'subcategory' ? subcategoryRows : filterRows;
        const idx = peers.findIndex((r) => r.id === row.id);
        if (idx <= 0) return;
        startSaveTransition(() => swapSortOrder(row, peers[idx - 1]));
    };

    const handleMoveDown = (row: VariableRowData) => {
        const peers = row.role === 'subcategory' ? subcategoryRows : filterRows;
        const idx = peers.findIndex((r) => r.id === row.id);
        if (idx === -1 || idx >= peers.length - 1) return;
        startSaveTransition(() => swapSortOrder(row, peers[idx + 1]));
    };

    const categorySelected = selectedCategory != null;
    const showEmptyCategoryHint = scope === 'category' && !categorySelected;

    return (
        <section className="border rounded p-3 mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <h2 className="h5 mb-1">Leaderboard variables</h2>
                    <p className="text-muted small mb-0">
                        Subcategory variables split a category into separate
                        boards (e.g. <code>platform</code> with N64 / Switch /
                        PC). Filter variables refine results within a board
                        (e.g. <code>region</code>). Game-wide rows apply to
                        every category; category-specific rows override them for
                        one category.
                    </p>
                </div>
            </div>

            <ul className="nav nav-pills mb-3">
                <li className="nav-item">
                    <button
                        type="button"
                        className={`nav-link ${scope === 'game' ? 'active' : ''}`}
                        onClick={() => {
                            setScope('game');
                            closeForm();
                        }}
                        disabled={busy}
                    >
                        Game-wide
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        type="button"
                        className={`nav-link ${scope === 'category' ? 'active' : ''}`}
                        onClick={() => {
                            setScope('category');
                            closeForm();
                        }}
                        disabled={busy}
                    >
                        Category-specific
                        {categorySelected && (
                            <span className="ms-1 text-muted small">
                                · {selectedCategory?.display}
                            </span>
                        )}
                    </button>
                </li>
            </ul>

            {loadError && (
                <div className="alert alert-danger py-2" role="alert">
                    {loadError}
                </div>
            )}

            {showEmptyCategoryHint && (
                <p className="text-muted">
                    Pick a category above to manage its overrides.
                </p>
            )}

            <div className="d-flex justify-content-end mb-2">
                {!formState.open && (scope === 'game' || categorySelected) && (
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() =>
                            setFormState({ open: true, mode: 'create' })
                        }
                        disabled={busy}
                    >
                        + Add variable
                    </button>
                )}
            </div>

            {formState.open && (
                <VariableForm
                    mode={formState.mode}
                    editing={
                        formState.mode === 'edit' ? formState.editing : null
                    }
                    reservedParams={reservedParams}
                    onSubmit={handleSubmit}
                    onCancel={closeForm}
                    isBusy={isSaving}
                    error={formError}
                />
            )}

            {(scope === 'game' || categorySelected) && (
                <>
                    <RoleTable
                        title="Subcategory variables"
                        rows={subcategoryRows}
                        emptyLabel={
                            scope === 'game'
                                ? 'No game-wide subcategory variables yet.'
                                : 'No category-specific subcategory variables yet.'
                        }
                        onEdit={(r) =>
                            setFormState({
                                open: true,
                                mode: 'edit',
                                editing: r,
                            })
                        }
                        onDelete={handleDelete}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        busy={busy}
                    />
                    <RoleTable
                        title="Filter variables"
                        rows={filterRows}
                        emptyLabel={
                            scope === 'game'
                                ? 'No game-wide filter variables yet.'
                                : 'No category-specific filter variables yet.'
                        }
                        onEdit={(r) =>
                            setFormState({
                                open: true,
                                mode: 'edit',
                                editing: r,
                            })
                        }
                        onDelete={handleDelete}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        busy={busy}
                    />
                </>
            )}
            <ConfirmDialog
                open={confirmDelete != null}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => {
                    if (confirmDelete) doDelete(confirmDelete);
                    setConfirmDelete(null);
                }}
                labelledBy="delete-variable-title"
                title="Delete variable?"
                message={`Delete variable "${confirmDelete?.name}"? Existing finished runs keep their resolved values until a re-resolve worker runs.`}
                confirmLabel="Delete"
                pending={isSaving}
            />
        </section>
    );
}

interface RoleTableProps {
    title: string;
    rows: VariableRowData[];
    emptyLabel: string;
    onEdit: (row: VariableRowData) => void;
    onDelete: (row: VariableRowData) => void;
    onMoveUp: (row: VariableRowData) => void;
    onMoveDown: (row: VariableRowData) => void;
    busy: boolean;
}

function RoleTable({
    title,
    rows,
    emptyLabel,
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
    busy,
}: RoleTableProps) {
    return (
        <div className="mb-3">
            <h3 className="h6 mb-2">{title}</h3>
            <div className="table-responsive">
                <table className="table table-sm align-middle">
                    <thead>
                        <tr>
                            <th />
                            <th>Name</th>
                            <th>Values</th>
                            <th>Default</th>
                            <th>Sort</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-muted">
                                    {emptyLabel}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, idx) => (
                                <VariableRow
                                    key={row.id}
                                    row={row}
                                    isFirst={idx === 0}
                                    isLast={idx === rows.length - 1}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onMoveUp={onMoveUp}
                                    onMoveDown={onMoveDown}
                                    isBusy={busy}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
