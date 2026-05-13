'use client';

import { FormEvent, useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { loadTimingSettingsAction } from './actions/load-timing-settings.action';
import { updateTimingSettingsAction } from './actions/update-timing-settings.action';

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory | null;
}

interface State {
    primaryTiming: PrimaryTiming;
    hideRealTime: boolean;
    hideGameTime: boolean;
}

const DEFAULT_STATE: State = {
    primaryTiming: 'realtime',
    hideRealTime: false,
    hideGameTime: false,
};

export function TimingSettingsSection({ gameSlug, gameId, category }: Props) {
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
            const res = await loadTimingSettingsAction({
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
                primaryTiming: res.result.primaryTiming,
                hideRealTime: res.result.hideRealTime,
                hideGameTime: res.result.hideGameTime,
            };
            setState(next);
            setOriginal(next);
        });
    }, [category, gameSlug, gameId]);

    if (!category) return null;

    const dirty =
        state.primaryTiming !== original.primaryTiming ||
        state.hideRealTime !== original.hideRealTime ||
        state.hideGameTime !== original.hideGameTime;
    const busy = isLoading || isSaving;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (state.hideRealTime && state.hideGameTime) {
            setFormError('Cannot hide both real time and game time.');
            return;
        }

        startSave(async () => {
            const res = await updateTimingSettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                primaryTiming:
                    state.primaryTiming !== original.primaryTiming
                        ? state.primaryTiming
                        : undefined,
                hideRealTime:
                    state.hideRealTime !== original.hideRealTime
                        ? state.hideRealTime
                        : undefined,
                hideGameTime:
                    state.hideGameTime !== original.hideGameTime
                        ? state.hideGameTime
                        : undefined,
            });
            if ('error' in res) {
                setFormError(res.error);
                return;
            }
            toast.success('Timing settings saved');
            setOriginal(state);
        });
    };

    return (
        <section className="border rounded p-3 mb-4">
            <h2 className="h5 mb-1">Timing Settings</h2>
            <p className="text-muted small mb-3">
                Defaults for <strong>{category.display}</strong>. Applies to how
                runs are displayed and which timing method is used to rank the
                leaderboard.
            </p>

            {loadError && (
                <div className="alert alert-danger py-2" role="alert">
                    {loadError}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="row g-3 align-items-end">
                    <div className="col-md-4">
                        <label className="form-label small">
                            Primary timing
                        </label>
                        <select
                            className="form-select form-select-sm"
                            value={state.primaryTiming}
                            onChange={(e) =>
                                setState((s) => ({
                                    ...s,
                                    primaryTiming: e.target
                                        .value as PrimaryTiming,
                                }))
                            }
                            disabled={busy}
                        >
                            <option value="realtime">Real time (RT)</option>
                            <option value="gametime">Game time (GT)</option>
                        </select>
                    </div>
                    <div className="col-md-4">
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="hideRT"
                                checked={state.hideRealTime}
                                onChange={(e) =>
                                    setState((s) => ({
                                        ...s,
                                        hideRealTime: e.target.checked,
                                        hideGameTime: e.target.checked
                                            ? false
                                            : s.hideGameTime,
                                    }))
                                }
                                disabled={busy}
                            />
                            <label
                                htmlFor="hideRT"
                                className="form-check-label small"
                            >
                                Hide real time
                            </label>
                        </div>
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="hideGT"
                                checked={state.hideGameTime}
                                onChange={(e) =>
                                    setState((s) => ({
                                        ...s,
                                        hideGameTime: e.target.checked,
                                        hideRealTime: e.target.checked
                                            ? false
                                            : s.hideRealTime,
                                    }))
                                }
                                disabled={busy}
                            />
                            <label
                                htmlFor="hideGT"
                                className="form-check-label small"
                            >
                                Hide game time
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
