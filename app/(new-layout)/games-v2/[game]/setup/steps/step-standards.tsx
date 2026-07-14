'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { suggestMinTimeMs } from '~src/lib/setup/suggestions';
import { parseTimeInput } from '~src/lib/time-input';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
import { createPolicyAction } from '../../manage/moderation/policies/actions/policies-actions.action';
import type { StepProps } from '../types';

function formatMs(ms: number): string {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;
}

export function StepStandards({ data, onAdvance }: StepProps) {
    const activeCategories = data.categories.filter((c) => c.active);
    const mainCat =
        activeCategories.find((c) => c.isMain) ?? activeCategories[0];

    // Scope: null = all categories (game-wide policy).
    const [scopeCategoryId, setScopeCategoryId] = useState<number | null>(null);
    const [requireVideo, setRequireVideo] = useState(
        activeCategories.length > 0 &&
            activeCategories.every((c) => c.requireVideo),
    );
    const [topNOnly, setTopNOnly] = useState(false);
    const [topN, setTopN] = useState('5');
    const [minTimeEnabled, setMinTimeEnabled] = useState(false);
    const [minTimeText, setMinTimeText] = useState('');
    const [flagWrPct, setFlagWrPct] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const scopedCat =
        scopeCategoryId === null
            ? mainCat
            : activeCategories.find((c) => c.id === scopeCategoryId);
    const wr = scopedCat ? (data.wrTimes[scopedCat.id] ?? null) : null;
    const suggestion = scopedCat
        ? suggestMinTimeMs(wr, scopedCat.totalFinishedAttemptCount ?? 0)
        : null;

    const save = () => {
        startSaving(async () => {
            setError(null);

            // Video requirement → category settings.
            const videoTargets =
                scopeCategoryId === null
                    ? activeCategories
                    : activeCategories.filter((c) => c.id === scopeCategoryId);
            for (const c of videoTargets) {
                const res = await updateCategorySettingsAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: c.id,
                    requireVideo,
                    requireVideoTopN:
                        requireVideo && topNOnly ? Number(topN) : null,
                });
                if ('error' in res) {
                    setError(`${c.display}: ${res.error}`);
                    return;
                }
            }

            // Minimum time → min_time policy ({ minTimeMs, minGameTimeMs }).
            if (minTimeEnabled) {
                const ms = parseTimeInput(minTimeText);
                if (!ms || ms <= 0) {
                    setError(
                        'Enter the minimum time as h:mm:ss, m:ss, or seconds.',
                    );
                    return;
                }
                const res = await createPolicyAction(data.game.name, {
                    policyType: 'min_time',
                    value: { minTimeMs: ms },
                    categoryId: scopeCategoryId,
                });
                if ('error' in res) {
                    setError(res.error);
                    return;
                }
            }

            // Auto-flag: hold suspiciously fast runs for manual review.
            if (flagWrPct) {
                const res = await createPolicyAction(data.game.name, {
                    policyType: 'auto_flag_faster_than_wr_pct',
                    value: { pct: 5 },
                    categoryId: scopeCategoryId,
                });
                if ('error' in res) {
                    setError(res.error);
                    return;
                }
            }

            toast.success('Standards saved');
            onAdvance();
        });
    };

    return (
        <section>
            <h2 className="h4">Standards</h2>
            <p className="text-muted">
                Guardrails that keep your verification queue manageable. All of
                this can be tuned later in Manage → Standards.
            </p>

            <label className="form-label" htmlFor="scope">
                Apply to
            </label>
            <select
                id="scope"
                className="form-select w-auto mb-3"
                value={scopeCategoryId ?? ''}
                onChange={(e) =>
                    setScopeCategoryId(
                        e.target.value ? Number(e.target.value) : null,
                    )
                }
            >
                <option value="">All categories</option>
                {activeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.display}
                    </option>
                ))}
            </select>

            <div className="card mb-3">
                <div className="card-body">
                    <label className="form-check-label">
                        <input
                            type="checkbox"
                            className="form-check-input me-2"
                            checked={requireVideo}
                            onChange={(e) => setRequireVideo(e.target.checked)}
                        />
                        <strong>Require video proof</strong>
                    </label>
                    {requireVideo && (
                        <div className="mt-2 ms-4">
                            <label className="form-check-label">
                                <input
                                    type="checkbox"
                                    className="form-check-input me-2"
                                    checked={topNOnly}
                                    onChange={(e) =>
                                        setTopNOnly(e.target.checked)
                                    }
                                />
                                Only for top
                            </label>{' '}
                            <input
                                className="form-control form-control-sm d-inline-block"
                                style={{ width: '4rem' }}
                                inputMode="numeric"
                                value={topN}
                                disabled={!topNOnly}
                                onChange={(e) => setTopN(e.target.value)}
                            />{' '}
                            places
                        </div>
                    )}
                </div>
            </div>

            <div className="card mb-3">
                <div className="card-body">
                    <label className="form-check-label">
                        <input
                            type="checkbox"
                            className="form-check-input me-2"
                            checked={minTimeEnabled}
                            onChange={(e) =>
                                setMinTimeEnabled(e.target.checked)
                            }
                        />
                        <strong>Minimum time</strong>{' '}
                        <span className="text-muted small">
                            auto-flags impossibly fast submissions
                        </span>
                    </label>
                    {minTimeEnabled && (
                        <div className="mt-2 ms-4">
                            <input
                                className="form-control w-auto d-inline-block"
                                value={minTimeText}
                                onChange={(e) => setMinTimeText(e.target.value)}
                                placeholder="e.g. 10:00"
                            />
                            {suggestion !== null && wr !== null && (
                                <button
                                    type="button"
                                    className="btn btn-link btn-sm"
                                    onClick={() =>
                                        setMinTimeText(formatMs(suggestion))
                                    }
                                >
                                    Fastest verified run is {formatMs(wr)} —
                                    suggest {formatMs(suggestion)}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="card mb-3">
                <div className="card-body">
                    <label className="form-check-label">
                        <input
                            type="checkbox"
                            className="form-check-input me-2"
                            checked={flagWrPct}
                            onChange={(e) => setFlagWrPct(e.target.checked)}
                        />
                        <strong>
                            Hold runs that beat the world record by 5%+ for
                            manual review
                        </strong>
                    </label>
                </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            <button
                type="button"
                className="btn btn-primary"
                disabled={isSaving}
                onClick={save}
            >
                {isSaving ? 'Saving…' : 'Save & continue'}
            </button>
        </section>
    );
}
