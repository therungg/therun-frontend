'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { VariablePreview } from '~src/lib/variables/consequences';
import { ROLE_LABEL } from '~src/lib/variables/language';
import type {
    ResolvedCategory,
    VariableRow as VariableRowData,
} from '../../../../../../types/leaderboards.types';
import { FormSection } from '../shared/form-kit';
import { createVariableAction } from './actions/create-variable.action';
import { deleteVariableAction } from './actions/delete-variable.action';
import { loadMergedVariablesAction } from './actions/load-merged-variables.action';
import { loadVariablesAction } from './actions/load-variables.action';
import { previewVariableAction } from './actions/preview-variable.action';
import { updateVariableAction } from './actions/update-variable.action';
import { ConsequenceDialog } from './consequence-dialog';
import { InEffectPanel } from './in-effect-panel';
import { VariableForm, type VariableFormValues } from './variable-form';
import { VariableTable } from './variable-table';

type Scope = 'game' | 'category';

type FormState =
    | { open: false }
    | {
          open: true;
          mode: 'create';
          scopeCategoryId: number | null;
          scopeLabel: string;
          /** Plain category display name at capture time, for the discard
           *  notice if this form gets closed out from under the moderator. */
          scopeCategoryDisplay: string;
      }
    | {
          open: true;
          mode: 'edit';
          editing: VariableRowData;
          scopeCategoryId: number | null;
          scopeLabel: string;
          scopeCategoryDisplay: string;
      };

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
    const [merged, setMerged] = useState<VariableRowData[]>([]);
    const [highlightId, setHighlightId] = useState<number | null>(null);
    const [reservedParams, setReservedParams] = useState<string[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [scope, setScope] = useState<Scope>('game');
    const [formState, setFormState] = useState<FormState>({ open: false });
    const [formError, setFormError] = useState<string | null>(null);
    const [discardNotice, setDiscardNotice] = useState<string | null>(null);
    const [isLoading, startLoadTransition] = useTransition();
    const [isSaving, startSaveTransition] = useTransition();
    const [pendingWrite, setPendingWrite] = useState<
        | { action: 'save'; values: VariableFormValues }
        | { action: 'delete'; row: VariableRowData }
        | null
    >(null);
    const [preview, setPreview] = useState<VariablePreview | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [isPreviewing, startPreview] = useTransition();
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

    const loadMerged = async () => {
        if (!selectedCategory) {
            setMerged([]);
            return;
        }
        const res = await loadMergedVariablesAction({
            gameSlug,
            categorySlug: selectedCategory.name,
        });
        if ('error' in res) {
            setMerged([]);
            return;
        }
        setMerged(res.result);
    };

    // The in-effect panel must reflect what the public board actually shows,
    // so it is reloaded alongside the admin list on every scope-relevant
    // change and after every write commits.
    const refreshAll = async () => {
        await Promise.all([refresh(), loadMerged()]);
    };

    const closeForm = () => {
        setFormState({ open: false });
        setFormError(null);
    };

    useEffect(() => {
        startLoadTransition(() => refreshAll());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId, selectedCategory?.id]);

    // A form whose captured scope no longer matches the selected category
    // (e.g. the moderator navigated to a different category rail entry while
    // a create form was open) is no longer valid — close it rather than let
    // it silently retarget. This component doesn't own category selection,
    // so it can't revert the navigation or prompt-and-cancel from inside an
    // effect; the best it can do is close the form and say so, rather than
    // discard it with no word at all.
    useEffect(() => {
        if (!formState.open) return;
        const stillValid =
            formState.scopeCategoryId === null ||
            formState.scopeCategoryId === selectedCategory?.id;
        if (!stillValid) {
            setDiscardNotice(
                `Your unsaved variable for ${formState.scopeCategoryDisplay} was closed when you switched category.`,
            );
            closeForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory?.id]);

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

    const gameWideRows = rows.filter((r) => r.categoryId === null);
    const subcategoryRows = visible.filter((r) => r.role === 'subcategory');
    const filterRows = visible.filter((r) => r.role === 'filter');

    // Returns whether the scope actually changed, so callers that pair the
    // switch with another effect (e.g. onJump's highlight) can skip that
    // effect when the moderator declines the discard prompt.
    const requestScopeChange = (next: Scope): boolean => {
        if (
            formState.open &&
            !window.confirm(
                'Discard the variable you are editing? Your changes are not saved.',
            )
        ) {
            return false;
        }
        setScope(next);
        closeForm();
        return true;
    };

    const openCreate = () => {
        setDiscardNotice(null);
        setFormState({
            open: true,
            mode: 'create',
            scopeCategoryId:
                scope === 'category' ? (selectedCategory?.id ?? null) : null,
            scopeLabel:
                scope === 'category'
                    ? `${selectedCategory?.display ?? 'this category'} only`
                    : 'Shared by all categories',
            scopeCategoryDisplay: selectedCategory?.display ?? 'this category',
        });
    };

    const openEdit = (row: VariableRowData) => {
        setDiscardNotice(null);
        setFormState({
            open: true,
            mode: 'edit',
            editing: row,
            scopeCategoryId: row.categoryId,
            scopeLabel:
                row.categoryId == null
                    ? 'Shared by all categories'
                    : `${selectedCategory?.display ?? 'this category'} only`,
            scopeCategoryDisplay: selectedCategory?.display ?? 'this category',
        });
    };

    // Only requests the preview — the write itself happens in commitWrite(),
    // invoked by the dialog's onConfirm. No path here reaches the server.
    const handleSubmit = (values: VariableFormValues) => {
        setFormError(null);
        setPreview(null);
        setPreviewError(null);
        setPendingWrite({ action: 'save', values });
        // Captured when the form opened. Reading it from live props here is
        // the bug that let an open create form silently retarget to
        // whichever category was selected by the time you hit Save.
        const categoryId = formState.open ? formState.scopeCategoryId : null;
        startPreview(async () => {
            try {
                const res = await previewVariableAction({
                    gameSlug,
                    gameId,
                    mode: 'save',
                    body: { categoryId, ...values },
                });
                if ('error' in res) setPreviewError(res.error);
                else setPreview(res.result);
            } catch {
                // previewVariableAction is a server action: a network
                // failure or a deploy-time action-id mismatch rejects the
                // promise instead of returning `{ error }`. Without this,
                // preview/previewError both stay null and the dialog looks
                // like an ordinary confirm with nothing to disable it.
                setPreviewError(
                    'Could not check what this change would do. Try again.',
                );
            }
        });
    };

    const handleDelete = (row: VariableRowData) => {
        setPreview(null);
        setPreviewError(null);
        setPendingWrite({ action: 'delete', row });
        startPreview(async () => {
            try {
                const res = await previewVariableAction({
                    gameSlug,
                    gameId,
                    mode: 'delete',
                    body: { categoryId: row.categoryId, name: row.name },
                });
                if ('error' in res) setPreviewError(res.error);
                else setPreview(res.result);
            } catch {
                setPreviewError(
                    'Could not check what this change would do. Try again.',
                );
            }
        });
    };

    // The actual create/update/delete call. Only reachable through the
    // dialog's confirm button, after a preview has been shown. The `!preview`
    // half of this guard is load-bearing: without it, a rejected preview
    // (caught above, but still leaving `preview === null`) would otherwise
    // let a click through with nothing previewed.
    const commitWrite = () => {
        if (!pendingWrite || !preview) return;

        if (pendingWrite.action === 'delete') {
            const row = pendingWrite.row;
            startSaveTransition(async () => {
                const res = await deleteVariableAction({
                    gameSlug,
                    gameId,
                    categoryId: row.categoryId,
                    name: row.name,
                });
                if ('error' in res) {
                    setPreviewError(res.error);
                    return;
                }
                toast.success(`Deleted "${row.name}"`);
                setPendingWrite(null);
                setPreview(null);
                setPreviewError(null);
                await refreshAll();
            });
            return;
        }

        if (!formState.open) return;
        const values = pendingWrite.values;
        const categoryId = formState.scopeCategoryId;

        if (formState.mode === 'create') {
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
                    setPreviewError(res.error);
                    return;
                }
                toast.success(`Created variable "${values.name}"`);
                setPendingWrite(null);
                setPreview(null);
                setPreviewError(null);
                closeForm();
                await refreshAll();
            });
            return;
        }

        // formState.mode === 'edit'
        const editing = formState.editing;
        startSaveTransition(async () => {
            const res = await updateVariableAction({
                gameSlug,
                gameId,
                body: {
                    // Upsert key is (gameId, categoryId, nameNormalized).
                    // Use the editing row's identity, NOT the form's (the
                    // name field is locked in edit mode anyway).
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
                setPreviewError(res.error);
                return;
            }
            toast.success(`Updated "${editing.name}"`);
            setPendingWrite(null);
            setPreview(null);
            setPreviewError(null);
            closeForm();
            await refreshAll();
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
        await refreshAll();
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
        <FormSection
            title="Leaderboard variables"
            lede={
                <>
                    One kind {ROLE_LABEL.subcategory} (subcategory) — each
                    answer gets its own leaderboard (e.g. <code>platform</code>{' '}
                    with N64 / Switch / PC). The other is {ROLE_LABEL.filter} —
                    answers refine results within one board (e.g.{' '}
                    <code>region</code>). Rows shared by all categories apply
                    everywhere; rows for one category override them there.
                </>
            }
            actions={
                !formState.open && (scope === 'game' || categorySelected) ? (
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={openCreate}
                        disabled={busy}
                    >
                        + Add variable
                    </button>
                ) : null
            }
        >
            {discardNotice && (
                <div
                    className="alert alert-warning py-2 d-flex justify-content-between align-items-center gap-2"
                    role="alert"
                >
                    <span>{discardNotice}</span>
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Dismiss"
                        onClick={() => setDiscardNotice(null)}
                    />
                </div>
            )}

            {selectedCategory && (
                <InEffectPanel
                    merged={merged}
                    gameWide={gameWideRows}
                    categoryDisplay={selectedCategory.display}
                    onJump={(v) => {
                        // All-or-nothing: if a dirty form declines the
                        // discard prompt, the scope doesn't switch and the
                        // row doesn't highlight either.
                        const next: Scope =
                            v.categoryId == null ? 'game' : 'category';
                        if (requestScopeChange(next)) {
                            setHighlightId(v.id);
                        }
                    }}
                />
            )}

            <ul className="nav nav-pills mb-3">
                <li className="nav-item">
                    <button
                        type="button"
                        className={`nav-link ${scope === 'game' ? 'active' : ''}`}
                        onClick={() => requestScopeChange('game')}
                        disabled={busy}
                    >
                        Shared by all categories
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        type="button"
                        className={`nav-link ${scope === 'category' ? 'active' : ''}`}
                        onClick={() => requestScopeChange('category')}
                        disabled={busy}
                    >
                        {categorySelected
                            ? `${selectedCategory?.display} only`
                            : 'This category only'}
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

            {formState.open && (
                <VariableForm
                    mode={formState.mode}
                    editing={
                        formState.mode === 'edit' ? formState.editing : null
                    }
                    reservedParams={reservedParams}
                    scopeLabel={formState.scopeLabel}
                    categoryDisplay={
                        selectedCategory?.display ?? 'this category'
                    }
                    gameWide={gameWideRows}
                    isCategoryScoped={formState.scopeCategoryId !== null}
                    onSubmit={handleSubmit}
                    onCancel={closeForm}
                    isBusy={isSaving}
                    error={formError}
                />
            )}

            {(scope === 'game' || categorySelected) && (
                <>
                    <VariableTable
                        title="Variables that split this board"
                        rows={subcategoryRows}
                        emptyLabel={
                            scope === 'game'
                                ? 'No board-splitting variables shared by all categories yet.'
                                : 'No board-splitting variables for this category yet.'
                        }
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        busy={busy}
                        highlightId={highlightId}
                    />
                    <VariableTable
                        title="Filter-only variables"
                        rows={filterRows}
                        emptyLabel={
                            scope === 'game'
                                ? 'No filter variables shared by all categories yet.'
                                : 'No filter variables for this category yet.'
                        }
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        busy={busy}
                        highlightId={highlightId}
                    />
                </>
            )}

            <ConsequenceDialog
                open={pendingWrite !== null}
                preview={preview}
                loading={isPreviewing}
                error={previewError}
                variableName={
                    pendingWrite?.action === 'delete'
                        ? pendingWrite.row.name
                        : (pendingWrite?.values.name ?? '')
                }
                action={pendingWrite?.action ?? 'save'}
                gameSlug={gameSlug}
                gameId={gameId}
                pending={isSaving}
                onConfirm={commitWrite}
                onCancel={() => {
                    setPendingWrite(null);
                    setPreview(null);
                    setPreviewError(null);
                }}
            />
        </FormSection>
    );
}
