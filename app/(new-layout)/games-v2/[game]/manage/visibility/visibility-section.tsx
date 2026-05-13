'use client';

import { FormEvent, useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { loadVisibilityAction } from './actions/load-visibility.action';
import { updateVisibilityAction } from './actions/update-visibility.action';

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory | null;
}

interface State {
    isMain: boolean;
    active: boolean;
}

const DEFAULT_STATE: State = { isMain: false, active: true };

export function VisibilitySection({ gameSlug, gameId, category }: Props) {
    const [state, setState] = useState<State>(DEFAULT_STATE);
    const [original, setOriginal] = useState<State>(DEFAULT_STATE);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isLoading, startLoad] = useTransition();
    const [isSaving, startSave] = useTransition();

    useEffect(() => {
        if (!category) return;
        setFormError(null);
        startLoad(async () => {
            const res = await loadVisibilityAction({
                gameSlug,
                gameId,
                categoryId: category.id,
            });
            if ('error' in res) {
                setLoadError(res.error);
                setState(DEFAULT_STATE);
                setOriginal(DEFAULT_STATE);
                return;
            }
            setLoadError(null);
            const next: State = {
                isMain: res.result.isMain,
                active: res.result.active,
            };
            setState(next);
            setOriginal(next);
        });
    }, [category, gameSlug, gameId]);

    if (!category) return null;

    const dirty =
        state.isMain !== original.isMain || state.active !== original.active;
    const busy = isLoading || isSaving;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);

        startSave(async () => {
            const res = await updateVisibilityAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                isMain:
                    state.isMain !== original.isMain ? state.isMain : undefined,
                active:
                    state.active !== original.active ? state.active : undefined,
            });
            if ('error' in res) {
                setFormError(res.error);
                return;
            }
            toast.success('Visibility settings saved');
            setOriginal(state);
        });
    };

    return (
        <section className="border rounded p-3 mb-4">
            <h2 className="h5 mb-1">Visibility</h2>
            <p className="text-muted small mb-3">
                Controls for <strong>{category.display}</strong>. Main
                categories show by default on the game page; others are hidden
                behind a "show more" toggle. Inactive categories are hidden
                entirely.
            </p>

            {loadError && (
                <div className="alert alert-danger py-2" role="alert">
                    {loadError}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="row g-3 align-items-end">
                    <div className="col-md-8">
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="isMain"
                                checked={state.isMain}
                                onChange={(e) =>
                                    setState((s) => ({
                                        ...s,
                                        isMain: e.target.checked,
                                    }))
                                }
                                disabled={busy}
                            />
                            <label
                                htmlFor="isMain"
                                className="form-check-label small"
                            >
                                Main category (shown by default on the game
                                page)
                            </label>
                        </div>
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="active"
                                checked={state.active}
                                onChange={(e) =>
                                    setState((s) => ({
                                        ...s,
                                        active: e.target.checked,
                                    }))
                                }
                                disabled={busy}
                            />
                            <label
                                htmlFor="active"
                                className="form-check-label small"
                            >
                                Active (uncheck to archive — hides on game page)
                            </label>
                        </div>
                    </div>
                    <div className="col-md-4 d-flex gap-2">
                        <button
                            type="submit"
                            className="btn btn-sm btn-primary"
                            disabled={busy || !dirty}
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                                setState(original);
                                setFormError(null);
                            }}
                            disabled={busy || !dirty}
                        >
                            Reset
                        </button>
                    </div>
                </div>
                {formError && (
                    <div className="alert alert-danger mt-2 mb-0 py-2">
                        {formError}
                    </div>
                )}
            </form>
        </section>
    );
}
