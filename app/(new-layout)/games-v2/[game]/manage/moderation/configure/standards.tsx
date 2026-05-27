'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    BoardPolicyRow,
    CreatePolicyInput,
    LeaderboardRosterRow,
    PolicyType,
} from '../../../../../../../types/moderation.types';
import {
    createPolicyAction,
    deletePolicyAction,
    updatePolicyAction,
} from '../policies/actions/policies-actions.action';
import { loadRosterAction } from '../roster/actions/load-roster.action';
import { loadStandardsAction } from './actions/standards.action';
import {
    SENSITIVITY_PCT,
    type Sensitivity,
    sensitivityFromPcts,
} from './sensitivity';
import { msToInput, parseTime } from './time-input';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    categories: Array<{ id: number; display: string }>;
    canEdit: boolean;
}

const MIN_REASON = 10;

function num(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
}

// Category-scoped, whole-category (no subcategory) policies are what the
// plain-language Standards surface manages.
function isCategoryScoped(p: BoardPolicyRow, categoryId: number): boolean {
    return p.categoryId === categoryId && p.subcategoryKey == null;
}

function findPolicy(
    policies: BoardPolicyRow[],
    type: PolicyType,
    categoryId: number,
): BoardPolicyRow | undefined {
    return policies.find(
        (p) => p.policyType === type && isCategoryScoped(p, categoryId),
    );
}

interface FormState {
    minInput: string;
    maxInput: string;
    nInput: string;
    sensitivity: Sensitivity;
}

function formFromPolicies(
    policies: BoardPolicyRow[],
    categoryId: number,
): FormState {
    const min = findPolicy(policies, 'min_time', categoryId);
    const max = findPolicy(policies, 'max_time', categoryId);
    const vid = findPolicy(policies, 'require_video_top_n', categoryId);
    const pbJump = findPolicy(policies, 'auto_flag_pb_jump_pct', categoryId);
    const fasterWr = findPolicy(
        policies,
        'auto_flag_faster_than_wr_pct',
        categoryId,
    );

    return {
        minInput: msToInput(min ? (num(min.value.rtMs) ?? null) : null),
        maxInput: msToInput(max ? (num(max.value.rtMs) ?? null) : null),
        nInput:
            vid && num(vid.value.n) !== undefined ? String(vid.value.n) : '',
        sensitivity: sensitivityFromPcts(
            pbJump ? num(pbJump.value.pct) : undefined,
            fasterWr ? num(fasterWr.value.pct) : undefined,
        ),
    };
}

export function Standards({
    gameSlug,
    gameDisplay,
    categories,
    canEdit,
}: Props) {
    const [categoryId, setCategoryId] = useState<number | null>(
        categories[0]?.id ?? null,
    );
    const [policies, setPolicies] = useState<BoardPolicyRow[]>([]);
    const [form, setForm] = useState<FormState>({
        minInput: '',
        maxInput: '',
        nInput: '',
        sensitivity: 'off',
    });
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSaving, startSaving] = useTransition();

    const [roster, setRoster] = useState<LeaderboardRosterRow[]>([]);
    const [rosterLoading, startRosterLoad] = useTransition();
    const [showSamples, setShowSamples] = useState(false);

    const loadForCategory = useCallback(
        async (catId: number) => {
            setLoading(true);
            setError(null);
            const res = await loadStandardsAction(gameSlug, catId);
            if ('error' in res) {
                setError(res.error);
                setLoading(false);
                return;
            }
            setPolicies(res.policies);
            setForm(formFromPolicies(res.policies, catId));
            setLoading(false);
        },
        [gameSlug],
    );

    // Load policies + roster whenever the selected category changes.
    useEffect(() => {
        if (categoryId == null) return;
        void loadForCategory(categoryId);
        startRosterLoad(async () => {
            const res = await loadRosterAction(gameSlug, categoryId, {});
            setRoster('error' in res ? [] : res.rows);
        });
    }, [categoryId, gameSlug, loadForCategory]);

    const reasonOk = reason.trim().length >= MIN_REASON;

    const handleSave = () => {
        if (categoryId == null) return;
        setError(null);

        const minRt = parseTime(form.minInput);
        const maxRt = parseTime(form.maxInput);
        if (Number.isNaN(minRt) || Number.isNaN(maxRt)) {
            setError(
                'Times must be in h:mm:ss, m:ss, or m:ss.SSS format and greater than zero.',
            );
            return;
        }
        const nTrim = form.nInput.trim();
        let n: number | null = null;
        if (nTrim !== '') {
            const parsed = Number.parseInt(nTrim, 10);
            if (!Number.isInteger(parsed) || parsed <= 0) {
                setError(
                    'Video requirement must be a whole number above zero.',
                );
                return;
            }
            n = parsed;
        }
        if (!reasonOk) {
            setError(`Reason is required (min ${MIN_REASON} characters).`);
            return;
        }

        const trimmedReason = reason.trim();
        const cid = categoryId;

        startSaving(async () => {
            // Each desired field maps to one policy type; we diff against the
            // currently-loaded policies and create/update/delete accordingly.
            type ActionResult =
                | { ok: true }
                | { ok: true; policy: BoardPolicyRow }
                | { error: string };
            const ops: Array<() => Promise<ActionResult>> = [];

            const planTimePolicy = (
                type: 'min_time' | 'max_time',
                value: number | null,
            ) => {
                const existing = findPolicy(policies, type, cid);
                if (value == null) {
                    if (existing) {
                        ops.push(() =>
                            deletePolicyAction(
                                gameSlug,
                                existing.id,
                                trimmedReason,
                            ),
                        );
                    }
                    return;
                }
                if (existing) {
                    if (num(existing.value.rtMs) !== value) {
                        ops.push(() =>
                            updatePolicyAction(
                                gameSlug,
                                existing.id,
                                { rtMs: value },
                                trimmedReason,
                            ),
                        );
                    }
                } else {
                    const input: CreatePolicyInput = {
                        policyType: type,
                        value: { rtMs: value },
                        categoryId: cid,
                        reason: trimmedReason,
                    };
                    ops.push(() => createPolicyAction(gameSlug, input));
                }
            };

            planTimePolicy('min_time', minRt);
            planTimePolicy('max_time', maxRt);

            // require_video_top_n
            const vidExisting = findPolicy(
                policies,
                'require_video_top_n',
                cid,
            );
            if (n == null) {
                if (vidExisting) {
                    ops.push(() =>
                        deletePolicyAction(
                            gameSlug,
                            vidExisting.id,
                            trimmedReason,
                        ),
                    );
                }
            } else if (vidExisting) {
                if (num(vidExisting.value.n) !== n) {
                    ops.push(() =>
                        updatePolicyAction(
                            gameSlug,
                            vidExisting.id,
                            { n },
                            trimmedReason,
                        ),
                    );
                }
            } else {
                const input: CreatePolicyInput = {
                    policyType: 'require_video_top_n',
                    value: { n },
                    categoryId: cid,
                    reason: trimmedReason,
                };
                ops.push(() => createPolicyAction(gameSlug, input));
            }

            // Auto-flag sensitivity → the two pct policies.
            const planPctPolicy = (
                type: 'auto_flag_pb_jump_pct' | 'auto_flag_faster_than_wr_pct',
                pct: number | null,
            ) => {
                const existing = findPolicy(policies, type, cid);
                if (pct == null) {
                    if (existing) {
                        ops.push(() =>
                            deletePolicyAction(
                                gameSlug,
                                existing.id,
                                trimmedReason,
                            ),
                        );
                    }
                    return;
                }
                if (existing) {
                    if (num(existing.value.pct) !== pct) {
                        ops.push(() =>
                            updatePolicyAction(
                                gameSlug,
                                existing.id,
                                { pct },
                                trimmedReason,
                            ),
                        );
                    }
                } else {
                    const input: CreatePolicyInput = {
                        policyType: type,
                        value: { pct },
                        categoryId: cid,
                        reason: trimmedReason,
                    };
                    ops.push(() => createPolicyAction(gameSlug, input));
                }
            };

            if (form.sensitivity === 'off') {
                planPctPolicy('auto_flag_pb_jump_pct', null);
                planPctPolicy('auto_flag_faster_than_wr_pct', null);
            } else {
                const pcts = SENSITIVITY_PCT[form.sensitivity];
                planPctPolicy('auto_flag_pb_jump_pct', pcts.pbJumpPct);
                planPctPolicy(
                    'auto_flag_faster_than_wr_pct',
                    pcts.fasterThanWrPct,
                );
            }

            if (ops.length === 0) {
                toast.info('No changes to save.');
                return;
            }

            for (const op of ops) {
                const res = await op();
                if ('error' in res) {
                    setError(res.error);
                    // Reload to resync with whatever did persist.
                    await loadForCategory(cid);
                    return;
                }
            }

            toast.success('Standards saved.');
            setReason('');
            await loadForCategory(cid);
        });
    };

    // ── Live preview (client-side, reflects UNSAVED field values) ──────────
    const minRtPreview = parseTime(form.minInput);
    const maxRtPreview = parseTime(form.maxInput);
    const nPreview = (() => {
        const t = form.nInput.trim();
        if (t === '') return null;
        const v = Number.parseInt(t, 10);
        return Number.isInteger(v) && v > 0 ? v : null;
    })();

    const minMs =
        minRtPreview != null && !Number.isNaN(minRtPreview)
            ? minRtPreview
            : null;
    const maxMs =
        maxRtPreview != null && !Number.isNaN(maxRtPreview)
            ? maxRtPreview
            : null;

    const belowMin =
        minMs == null
            ? []
            : roster.filter((r) => r.time != null && r.time < minMs);
    const overMax =
        maxMs == null
            ? []
            : roster.filter((r) => r.time != null && r.time > maxMs);
    const missingVideo =
        nPreview == null
            ? []
            : roster
                  .filter((r) => r.isLeaderboardEntry && r.time != null)
                  .sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
                  .slice(0, nPreview)
                  .filter((r) => r.vodUrl == null);

    const sampleRows = [
        ...belowMin.map((r) => ({ r, label: 'below minimum' as const })),
        ...overMax.map((r) => ({ r, label: 'over maximum' as const })),
        ...missingVideo.map((r) => ({ r, label: 'missing video' as const })),
    ];

    return (
        <section className="mb-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                <h2 className="h5 mb-0">Standards</h2>
                {categories.length > 0 && (
                    <select
                        className="form-select form-select-sm"
                        style={{ maxWidth: '16rem' }}
                        aria-label="Category for standards"
                        value={categoryId ?? ''}
                        onChange={(e) => {
                            const id = Number.parseInt(e.target.value, 10);
                            setCategoryId(Number.isFinite(id) ? id : null);
                        }}
                        disabled={isSaving}
                    >
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.display}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <p className="text-muted small">
                Set the leaderboard standards for this category of {gameDisplay}
                . Changes apply once you save.
            </p>

            {categoryId == null ? (
                <p className="text-muted">This game has no categories.</p>
            ) : loading ? (
                <p className="text-muted">Loading standards…</p>
            ) : (
                <div className="border rounded p-3 bg-light-subtle">
                    <div className="row g-3">
                        <div className="col-md-4">
                            <label
                                htmlFor="std-min"
                                className="form-label small mb-1"
                            >
                                Reject runs faster than
                            </label>
                            <input
                                id="std-min"
                                type="text"
                                className="form-control form-control-sm"
                                value={form.minInput}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        minInput: e.target.value,
                                    })
                                }
                                placeholder="e.g. 0:30 (none = no minimum)"
                                disabled={!canEdit || isSaving}
                            />
                        </div>
                        <div className="col-md-4">
                            <label
                                htmlFor="std-max"
                                className="form-label small mb-1"
                            >
                                Reject runs slower than
                            </label>
                            <input
                                id="std-max"
                                type="text"
                                className="form-control form-control-sm"
                                value={form.maxInput}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        maxInput: e.target.value,
                                    })
                                }
                                placeholder="e.g. 5:00:00 (none = no maximum)"
                                disabled={!canEdit || isSaving}
                            />
                        </div>
                        <div className="col-md-4">
                            <label
                                htmlFor="std-video"
                                className="form-label small mb-1"
                            >
                                Require video in the top
                            </label>
                            <input
                                id="std-video"
                                type="number"
                                min={1}
                                step={1}
                                className="form-control form-control-sm"
                                value={form.nInput}
                                onChange={(e) =>
                                    setForm({ ...form, nInput: e.target.value })
                                }
                                placeholder="e.g. 10 (blank = not required)"
                                disabled={!canEdit || isSaving}
                            />
                        </div>
                    </div>

                    <div className="mt-3">
                        <span className="form-label small mb-1 d-block">
                            Auto-flag suspicious runs
                        </span>
                        <div
                            className="btn-group btn-group-sm"
                            role="group"
                            aria-label="Auto-flag sensitivity"
                        >
                            {(['off', 'normal', 'strict'] as Sensitivity[]).map(
                                (s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        className={`btn ${
                                            form.sensitivity === s
                                                ? 'btn-primary'
                                                : 'btn-outline-secondary'
                                        }`}
                                        onClick={() =>
                                            setForm({
                                                ...form,
                                                sensitivity: s,
                                            })
                                        }
                                        disabled={!canEdit || isSaving}
                                    >
                                        {s === 'off'
                                            ? 'Off'
                                            : s === 'normal'
                                              ? 'Normal'
                                              : 'Strict'}
                                    </button>
                                ),
                            )}
                        </div>
                        <div className="form-text">
                            {form.sensitivity === 'off'
                                ? 'New submissions are not auto-flagged.'
                                : 'Applies to new submissions as they are added.'}
                        </div>
                    </div>

                    {/* ── Live preview ─────────────────────────────────── */}
                    <div className="border rounded p-3 mt-3 bg-body">
                        {rosterLoading ? (
                            <span className="text-muted small">
                                Computing preview…
                            </span>
                        ) : (
                            <>
                                <div>
                                    With these standards:{' '}
                                    <strong>{belowMin.length}</strong> run
                                    {belowMin.length === 1 ? '' : 's'} below
                                    minimum · <strong>{overMax.length}</strong>{' '}
                                    over maximum ·{' '}
                                    <strong>{missingVideo.length}</strong>{' '}
                                    missing required video in the top{' '}
                                    {nPreview ?? '—'}.
                                </div>
                                {sampleRows.length > 0 && (
                                    <button
                                        type="button"
                                        className="btn btn-link btn-sm px-0"
                                        onClick={() =>
                                            setShowSamples((v) => !v)
                                        }
                                    >
                                        {showSamples
                                            ? 'Hide affected runs'
                                            : `Show affected runs (${sampleRows.length})`}
                                    </button>
                                )}
                                {showSamples && sampleRows.length > 0 && (
                                    <ul className="list-unstyled small mb-0 mt-1">
                                        {sampleRows.slice(0, 50).map((s) => (
                                            <li key={`${s.label}-${s.r.runId}`}>
                                                {s.r.runnerName} —{' '}
                                                {s.r.time != null ? (
                                                    <DurationToFormatted
                                                        duration={s.r.time}
                                                        withMillis
                                                    />
                                                ) : (
                                                    '—'
                                                )}{' '}
                                                <span className="text-muted">
                                                    ({s.label})
                                                </span>
                                            </li>
                                        ))}
                                        {sampleRows.length > 50 && (
                                            <li className="text-muted">
                                                …and {sampleRows.length - 50}{' '}
                                                more
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </>
                        )}
                    </div>

                    {/* ── Save / read-only note ────────────────────────── */}
                    {canEdit ? (
                        <div className="mt-3">
                            <label
                                htmlFor="std-reason"
                                className="form-label small mb-1"
                            >
                                Reason for these changes
                            </label>
                            <textarea
                                id="std-reason"
                                className="form-control form-control-sm"
                                rows={2}
                                placeholder={`Reason (min ${MIN_REASON} chars)`}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={isSaving}
                            />
                            {error && (
                                <div className="alert alert-danger mt-2 mb-0 py-2">
                                    {error}
                                </div>
                            )}
                            <div className="d-flex justify-content-end mt-2">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={handleSave}
                                    disabled={isSaving || !reasonOk}
                                >
                                    {isSaving ? 'Saving…' : 'Save standards'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted small mt-3 mb-0">
                            Only board-admins can change standards.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}
