'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';
import type {
    ResolvedCategory,
    VariableDef,
} from '../../../../../../types/leaderboards.types';
import type { ManagePageData } from '../types';
import { deleteMinimumAction } from './actions/delete-minimum.action';
import { upsertMinimumAction } from './actions/upsert-minimum.action';
import { loadCategoryDataAction } from './load-category-data.action';
import { type FormSubmitValues, MinimumForm } from './minimum-form';
import { MinimumRow } from './minimum-row';

type FormState =
    | { open: false }
    | { open: true; mode: 'create' }
    | { open: true; mode: 'edit'; editing: MinimumTime };

interface Props {
    data: ManagePageData;
}

function flagSummary(flagged: number, unflagged: number): string {
    const parts: string[] = [];
    if (flagged > 0) parts.push(`${flagged} run(s) newly hidden`);
    if (unflagged > 0) parts.push(`${unflagged} run(s) restored`);
    return parts.length === 0 ? '' : ` — ${parts.join(', ')}.`;
}

export function MinimumsSection({ data }: Props) {
    const [selectedCategoryId, setSelectedCategoryId] = useState(
        data.initialCategoryId,
    );
    const [variables, setVariables] = useState<VariableDef[]>(
        data.initialVariables,
    );
    const [minimums, setMinimums] = useState<MinimumTime[]>(
        data.initialMinimums,
    );
    const [loadError, setLoadError] = useState<string | null>(null);
    const [formState, setFormState] = useState<FormState>({ open: false });
    const [formError, setFormError] = useState<string | null>(null);
    const [isLoading, startLoadTransition] = useTransition();
    const [isSaving, startSaveTransition] = useTransition();

    const selectedCategory: ResolvedCategory | undefined = data.categories.find(
        (c) => c.id === selectedCategoryId,
    );
    const busy = isLoading || isSaving;

    const refresh = async (categoryId: number, categorySlug: string) => {
        const res = await loadCategoryDataAction({
            gameSlug: data.game.name,
            gameId: data.game.id,
            categorySlug,
            categoryId,
        });
        if ('error' in res) {
            setLoadError(res.error);
            setVariables([]);
            setMinimums([]);
        } else {
            setLoadError(null);
            setVariables(res.result.variables);
            setMinimums(res.result.minimums);
        }
    };

    const switchCategory = (cat: ResolvedCategory) => {
        if (cat.id === selectedCategoryId) return;
        setSelectedCategoryId(cat.id);
        setFormState({ open: false });
        setFormError(null);
        startLoadTransition(() => refresh(cat.id, cat.name));
    };

    const handleSubmit = (values: FormSubmitValues) => {
        if (!selectedCategory) return;
        setFormError(null);

        startSaveTransition(async () => {
            const res = await upsertMinimumAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: selectedCategory.id,
                subcategoryHash: values.subcategoryHash,
                minTimeMs: values.minTimeMs,
                minGameTimeMs: values.minGameTimeMs,
            });
            if ('error' in res) {
                setFormError(res.error);
                return;
            }
            toast.success(
                `Saved${flagSummary(res.result.flagged, res.result.unflagged)}`,
            );
            setFormState({ open: false });
            await refresh(selectedCategory.id, selectedCategory.name);
        });
    };

    const handleDelete = (row: MinimumTime) => {
        if (!selectedCategory) return;
        if (
            !confirm(
                'Delete this minimum time? Below-threshold runs will be restored to the leaderboard.',
            )
        ) {
            return;
        }

        startSaveTransition(async () => {
            const res = await deleteMinimumAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: selectedCategory.id,
                subcategoryHash: row.subcategoryHash,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            const note =
                res.result.unflagged > 0
                    ? ` — ${res.result.unflagged} run(s) restored.`
                    : '';
            toast.success(`Removed${note}`);
            await refresh(selectedCategory.id, selectedCategory.name);
        });
    };

    return (
        <section>
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h2 className="h5 mb-0">Minimum Times</h2>
                {selectedCategory && !formState.open && (
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() =>
                            setFormState({ open: true, mode: 'create' })
                        }
                        disabled={busy}
                    >
                        + Add minimum
                    </button>
                )}
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3">
                {data.categories.map((cat) => (
                    <button
                        key={cat.id}
                        type="button"
                        className={`btn btn-sm ${
                            cat.id === selectedCategoryId
                                ? 'btn-primary'
                                : 'btn-outline-secondary'
                        }`}
                        onClick={() => switchCategory(cat)}
                        disabled={busy}
                    >
                        {cat.display}
                    </button>
                ))}
            </div>

            {loadError && (
                <div className="alert alert-danger" role="alert">
                    {loadError}
                </div>
            )}

            {formState.open && (
                <MinimumForm
                    mode={formState.mode}
                    editing={
                        formState.mode === 'edit' ? formState.editing : null
                    }
                    onSubmit={handleSubmit}
                    onCancel={() => {
                        setFormState({ open: false });
                        setFormError(null);
                    }}
                    isBusy={isSaving}
                    error={formError}
                />
            )}

            {selectedCategory && (
                <div className="table-responsive">
                    <table className="table table-sm align-middle">
                        <thead>
                            <tr>
                                <th>Subcategory</th>
                                <th>Min RT</th>
                                <th>Min GT</th>
                                <th>Set by</th>
                                <th>Updated</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {minimums.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-muted">
                                        No minimums set for this category yet.
                                    </td>
                                </tr>
                            ) : (
                                minimums.map((row) => (
                                    <MinimumRow
                                        key={row.subcategoryHash}
                                        row={row}
                                        variables={variables}
                                        onEdit={(r) =>
                                            setFormState({
                                                open: true,
                                                mode: 'edit',
                                                editing: r,
                                            })
                                        }
                                        onDelete={handleDelete}
                                        isBusy={busy}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
