'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { VariablePreview } from '~src/lib/variables/consequences';
import { toEffective } from '~src/lib/variables/effective';
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
import { VariableBandPreview } from './band-preview';
import { CombinationsSection } from './combinations-section';
import { ConsequenceDialog } from './consequence-dialog';
import { VariableForm, type VariableFormValues } from './variable-form';
import { VariableTable } from './variable-table';

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
    /**
     * 'game': the shared surface — the wizard's Subcategories & filters step
     * and the console pane of the same name. Edits game-wide rows only.
     * 'category': one category's view inside the category editor — shows the
     * effective board structure (shared rows included, read-only) and edits
     * category-scoped rows only.
     */
    mode: 'game' | 'category';
    /** Required in category mode; ignored in game mode. */
    selectedCategory: ResolvedCategory | null;
    /** Category mode: where the shared rows are edited (wizard step or
     *  console pane), linked from the read-only shared note. */
    sharedHref?: string;
}

export function VariablesSection({
    gameSlug,
    gameId,
    mode,
    selectedCategory,
    sharedHref,
}: Props) {
    const [rows, setRows] = useState<VariableRowData[]>([]);
    const [merged, setMerged] = useState<VariableRowData[]>([]);
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

    const categorySelected = selectedCategory != null;
    const categoryMode = mode === 'category';

    const refresh = async () => {
        const res = await loadVariablesAction({
            gameSlug,
            gameId,
            categoryId: categoryMode ? (selectedCategory?.id ?? null) : null,
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
        if (!categoryMode || !selectedCategory) {
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

    // The band preview must reflect what the public board actually shows, so
    // the merged list reloads alongside the admin list on every scope-relevant
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
    // (e.g. the moderator navigated to a different category while a create
    // form was open) is no longer valid — close it rather than let it
    // silently retarget.
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

    const scopeCategoryId = categoryMode
        ? (selectedCategory?.id ?? null)
        : null;
    const visible = (Array.isArray(rows) ? rows : [])
        .filter((r) => r.categoryId === scopeCategoryId)
        .sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        );

    const gameWideRows = rows.filter((r) => r.categoryId === null);
    const subcategoryRows = visible.filter((r) => r.role === 'subcategory');
    const filterRows = visible.filter((r) => r.role === 'filter');

    // What the board renders: game mode previews the shared rows themselves;
    // category mode previews the merged (public) list for this category.
    const effective = categoryMode
        ? toEffective(merged, gameWideRows)
        : toEffective(gameWideRows, gameWideRows);
    const sharedInEffect = effective.filter((v) => v.source === 'shared');
    const overrides = effective.filter(
        (v) => v.source === 'category-overrides-shared',
    );

    const scopeLabel = categoryMode
        ? `${selectedCategory?.display ?? 'this category'} only`
        : 'Shared by all categories';

    const openCreate = () => {
        setDiscardNotice(null);
        setFormState({
            open: true,
            mode: 'create',
            scopeCategoryId,
            scopeLabel,
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

    const canAdd = !categoryMode || categorySelected;

    return (
        <FormSection
            title={CONCEPT_LABEL.variables}
            lede={
                categoryMode ? (
                    <>
                        What runners see on{' '}
                        <strong>
                            {selectedCategory?.display ?? 'this category'}
                        </strong>
                        , shared variables included. Variables created here
                        apply to this category only — one with a shared
                        variable's name replaces it here.
                    </>
                ) : (
                    <>
                        A <strong>subcategory</strong> gives each value its own
                        leaderboard (Platform: N64 / PC — two boards). A{' '}
                        <strong>filter</strong> refines results within one board
                        (Region: US / JP). Defined here, they apply to every
                        category; a category can override one from its own page.
                    </>
                )
            }
            actions={
                !formState.open && canAdd ? (
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
                    variables={effective}
                    contextLabel={
                        categoryMode
                            ? (selectedCategory?.display ?? 'This category')
                            : 'Every category'
                    }
                />
            )}

            {categoryMode && sharedInEffect.length > 0 && (
                <p className="text-muted small">
                    {sharedInEffect.map((v) => v.name).join(', ')}{' '}
                    {sharedInEffect.length === 1 ? 'is' : 'are'} shared by all
                    categories
                    {sharedHref ? (
                        <>
                            {' '}
                            — edit {sharedInEffect.length === 1 ? 'it' : 'them'}{' '}
                            in{' '}
                            <Link href={sharedHref}>
                                {CONCEPT_LABEL.variables}
                            </Link>
                            .
                        </>
                    ) : (
                        '.'
                    )}
                    {overrides.length > 0 && (
                        <>
                            {' '}
                            {overrides.map((v) => v.name).join(', ')}{' '}
                            {overrides.length === 1 ? 'is' : 'are'} overridden
                            for this category below.
                        </>
                    )}
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

            {canAdd && (
                <>
                    <VariableTable
                        title={
                            categoryMode
                                ? 'Subcategories for this category only'
                                : 'Subcategories — one board per value'
                        }
                        rows={subcategoryRows}
                        emptyLabel={
                            categoryMode
                                ? 'No category-only subcategories — the shared ones above apply as-is.'
                                : 'No shared subcategories yet — every category is a single board.'
                        }
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        busy={busy}
                    />
                    <VariableTable
                        title={
                            categoryMode
                                ? 'Filters for this category only'
                                : 'Filters — refine within a board'
                        }
                        rows={filterRows}
                        emptyLabel={
                            categoryMode
                                ? 'No category-only filters.'
                                : 'No shared filters yet.'
                        }
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        busy={busy}
                    />
                </>
            )}

            {categoryMode && selectedCategory && (
                <CombinationsSection
                    gameSlug={gameSlug}
                    gameId={gameId}
                    selectedCategory={selectedCategory}
                    variables={merged}
                />
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
