'use client';

import {
    type FormEvent,
    useEffect,
    useRef,
    useState,
    useTransition,
} from 'react';
import { toast } from 'react-toastify';
import { timeToMillis } from '~src/components/util/datetime';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import type { ManagePageData } from '../types';
import { deleteMinimumAction } from './actions/delete-minimum.action';
import { upsertMinimumAction } from './actions/upsert-minimum.action';
import { loadCategoryDataAction } from './load-category-data.action';

interface Props {
    data: ManagePageData;
    selectedCategory: ResolvedCategory | null;
}

function msToInput(ms: number | null): string {
    if (ms === null) return '';
    const totalMs = Math.max(0, Math.round(ms));
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    const pad = (n: number, w: number) => String(n).padStart(w, '0');
    const base =
        hours > 0
            ? `${hours}:${pad(minutes, 2)}:${pad(seconds, 2)}`
            : `${pad(minutes, 2)}:${pad(seconds, 2)}`;
    return millis === 0 ? base : `${base}.${pad(millis, 3)}`;
}

function parseTime(s: string): number | null {
    const trimmed = s.trim();
    if (trimmed === '') return null;
    const ms = timeToMillis(trimmed);
    if (!Number.isFinite(ms) || ms <= 0) return Number.NaN;
    return ms;
}

function flagSummary(flagged: number, unflagged: number): string {
    const parts: string[] = [];
    if (flagged > 0) parts.push(`${flagged} run(s) newly hidden`);
    if (unflagged > 0) parts.push(`${unflagged} run(s) restored`);
    return parts.length === 0 ? '' : ` — ${parts.join(', ')}.`;
}

export function MinimumsSection({ data, selectedCategory }: Props) {
    const [minimum, setMinimum] = useState<MinimumTime | null>(
        data.initialMinimum,
    );
    const [loadError, setLoadError] = useState<string | null>(null);
    const [rtInput, setRtInput] = useState(
        msToInput(data.initialMinimum?.minTimeMs ?? null),
    );
    const [gtInput, setGtInput] = useState(
        msToInput(data.initialMinimum?.minGameTimeMs ?? null),
    );
    const [formError, setFormError] = useState<string | null>(null);
    const [isLoading, startLoadTransition] = useTransition();
    const [isSaving, startSaveTransition] = useTransition();

    const initialCategoryIdRef = useRef(data.initialCategoryId);
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
            setMinimum(null);
            setRtInput('');
            setGtInput('');
        } else {
            setLoadError(null);
            setMinimum(res.result.minimum);
            setRtInput(msToInput(res.result.minimum?.minTimeMs ?? null));
            setGtInput(msToInput(res.result.minimum?.minGameTimeMs ?? null));
        }
    };

    useEffect(() => {
        if (!selectedCategory) return;
        if (selectedCategory.id === initialCategoryIdRef.current) return;
        setFormError(null);
        startLoadTransition(() =>
            refresh(selectedCategory.id, selectedCategory.name),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory?.id]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!selectedCategory) return;
        setFormError(null);

        const rt = parseTime(rtInput);
        const gt = parseTime(gtInput);

        if (Number.isNaN(rt) || Number.isNaN(gt)) {
            setFormError(
                'Times must be in h:mm:ss, m:ss, or m:ss.SSS format and greater than zero.',
            );
            return;
        }
        if (rt === null && gt === null) {
            setFormError('At least one of RT or GT minimum is required.');
            return;
        }

        startSaveTransition(async () => {
            const res = await upsertMinimumAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: selectedCategory.id,
                minTimeMs: rt,
                minGameTimeMs: gt,
            });
            if ('error' in res) {
                setFormError(res.error);
                return;
            }
            toast.success(
                `Saved${flagSummary(res.result.flagged, res.result.unflagged)}`,
            );
            await refresh(selectedCategory.id, selectedCategory.name);
        });
    };

    const handleClear = () => {
        if (!selectedCategory || !minimum) return;
        if (
            !confirm(
                'Clear the minimum time for this category? Below-threshold runs will be restored to the leaderboard.',
            )
        ) {
            return;
        }

        startSaveTransition(async () => {
            const res = await deleteMinimumAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: selectedCategory.id,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            const note =
                res.result.unflagged > 0
                    ? ` — ${res.result.unflagged} run(s) restored.`
                    : '';
            toast.success(`Cleared${note}`);
            await refresh(selectedCategory.id, selectedCategory.name);
        });
    };

    return (
        <section>
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h2 className="h5 mb-0">Minimum Time</h2>
            </div>

            {loadError && (
                <div className="alert alert-danger" role="alert">
                    {loadError}
                </div>
            )}

            {selectedCategory && (
                <form
                    onSubmit={handleSubmit}
                    className="border rounded p-3 bg-light-subtle"
                >
                    <p className="text-muted small mb-3">
                        Runs below the configured minimum are hidden from the
                        leaderboard. At least one of RT or GT is required.
                    </p>

                    <div className="row g-2">
                        <div className="col-md-4">
                            <label className="form-label small">
                                Min RT (h:mm:ss.SSS)
                            </label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={rtInput}
                                onChange={(e) => setRtInput(e.target.value)}
                                placeholder="e.g. 1:23:45 or 0:30"
                                disabled={busy}
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label small">
                                Min GT (h:mm:ss.SSS)
                            </label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={gtInput}
                                onChange={(e) => setGtInput(e.target.value)}
                                placeholder="(optional)"
                                disabled={busy}
                            />
                        </div>
                        <div className="col-md-4 d-flex align-items-end gap-2">
                            <button
                                type="submit"
                                className="btn btn-sm btn-primary"
                                disabled={busy}
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={handleClear}
                                disabled={busy || !minimum}
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    {minimum && (
                        <small className="text-muted d-block mt-2">
                            Last updated{' '}
                            {new Date(minimum.updatedAt).toLocaleString()}
                        </small>
                    )}

                    {formError && (
                        <div className="alert alert-danger mt-2 mb-0 py-2">
                            {formError}
                        </div>
                    )}
                </form>
            )}
        </section>
    );
}
