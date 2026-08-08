'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { VariablePreview } from '~src/lib/variables/consequences';
import type {
    ResolvedCategory,
    VariableRow as VariableRowData,
} from '../../../../../../types/leaderboards.types';
import { FormSection } from '../shared/form-kit';
import { createVariableAction } from './actions/create-variable.action';
import { deleteVariableAction } from './actions/delete-variable.action';
import { loadVariablesAction } from './actions/load-variables.action';
import { previewVariableAction } from './actions/preview-variable.action';
import { updateVariableAction } from './actions/update-variable.action';
import { VariableBandPreview } from './band-preview';
import { CombinationsSection } from './combinations-section';
import { ConsequenceDialog } from './consequence-dialog';
import { ValueSuggestions } from './value-suggestions';
import { VariableForm, type VariableFormValues } from './variable-form';
import { VariableTable } from './variable-table';

type FormState =
    | { open: false }
    | {
          open: true;
          mode: 'create';
          scopeCategoryId: number;
          /** Plain category display name at capture time, for the discard
           *  notice if this form gets closed out from under the moderator. */
          scopeCategoryDisplay: string;
      }
    | {
          open: true;
          mode: 'edit';
          editing: VariableRowData;
          scopeCategoryId: number;
          scopeCategoryDisplay: string;
      };

interface Props {
    gameSlug: string;
    gameId: number;
    /** Variables are category-scoped only — this section always edits one
     *  category's rows, inside the category editor. */
    selectedCategory: ResolvedCategory;
}

export function VariablesSection({
    gameSlug,
    gameId,
    selectedCategory,
}: Props) {
    const [rows, setRows] = useState<VariableRowData[]>([]);
    const [reservedParams, setReservedParams] = useState<string[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
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
            categoryId: selectedCategory.id,
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

    const closeForm = () => {
        setFormState({ open: false });
        setFormError(null);
    };

    useEffect(() => {
        startLoadTransition(() => refresh());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId, selectedCategory.id]);

    // A form whose captured scope no longer matches the selected category
    // (e.g. the moderator navigated to a different category while a create
    // form was open) is no longer valid — close it rather than let it
    // silently retarget.
    useEffect(() => {
        if (!formState.open) return;
        if (formState.scopeCategoryId !== selectedCategory.id) {
            setDiscardNotice(
                `Your unsaved variable for ${formState.scopeCategoryDisplay} was closed when you switched category.`,
            );
            closeForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory.id]);

    const visible = (Array.isArray(rows) ? rows : [])
        .filter((r) => r.categoryId === selectedCategory.id)
        .sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        );

    const subcategoryRows = visible.filter((r) => r.role === 'subcategory');
    const filterRows = visible.filter((r) => r.role === 'filter');

    const scopeLabel = `${selectedCategory.display} only`;

    const openCreate = () => {
        setDiscardNotice(null);
        setFormState({
            open: true,
            mode: 'create',
            scopeCategoryId: selectedCategory.id,
            scopeCategoryDisplay: selectedCategory.display,
        });
    };

    const openEdit = (row: VariableRowData) => {
        setDiscardNotice(null);
        setFormState({
            open: true,
            mode: 'edit',
            editing: row,
            scopeCategoryId: row.categoryId,
            scopeCategoryDisplay: selectedCategory.display,
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
        const categoryId = formState.open
            ? formState.scopeCategoryId
            : selectedCategory.id;
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
                await refresh();
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
                        nameNormalized: values.nameNormalized,
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
                await refresh();
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
                    // Upsert identity is (gameId, categoryId, nameNormalized):
                    // keep the editing row's stable key so runs still match,
                    // but take the NEW display name from the form — editing the
                    // friendly label is the whole point.
                    categoryId: editing.categoryId,
                    name: values.name,
                    nameNormalized: editing.nameNormalized,
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
                    nameNormalized: row.nameNormalized,
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

    return (
        <FormSection
            title={CONCEPT_LABEL.variables}
            lede={
                <>
                    How <strong>{selectedCategory.display}</strong> is
                    structured. A <strong>subcategory</strong> gives each value
                    its own leaderboard (Platform: N64 / PC — two boards). A{' '}
                    <strong>filter</strong> refines results within one board
                    (Region: US / JP). Everything here applies to this category
                    only.
                </>
            }
            actions={
                !formState.open ? (
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

            {loadError && (
                <div className="alert alert-danger py-2" role="alert">
                    {loadError}
                </div>
            )}

            {!isLoading && (
                <VariableBandPreview
                    variables={visible}
                    contextLabel={selectedCategory.display}
                />
            )}

            {formState.open && (
                <VariableForm
                    mode={formState.mode}
                    editing={
                        formState.mode === 'edit' ? formState.editing : null
                    }
                    reservedParams={reservedParams}
                    scopeLabel={scopeLabel}
                    categoryDisplay={selectedCategory.display}
                    onSubmit={handleSubmit}
                    onCancel={closeForm}
                    isBusy={isSaving}
                    error={formError}
                />
            )}

            <VariableTable
                title="Subcategories — one board per value"
                rows={subcategoryRows}
                emptyLabel="No subcategories yet — this category is a single board."
                onEdit={openEdit}
                onDelete={handleDelete}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                busy={busy}
            />
            <VariableTable
                title="Filters — refine within a board"
                rows={filterRows}
                emptyLabel="No filters yet."
                onEdit={openEdit}
                onDelete={handleDelete}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                busy={busy}
            />

            <ValueSuggestions
                gameSlug={gameSlug}
                gameId={gameId}
                selectedCategory={selectedCategory}
            />

            <CombinationsSection
                gameSlug={gameSlug}
                gameId={gameId}
                selectedCategory={selectedCategory}
                variables={visible}
            />

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
