'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
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
import { msToInput, parseTime } from './time-input';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    category: ResolvedCategory;
    canEdit: boolean;
}

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

function minInputFromPolicies(
    policies: BoardPolicyRow[],
    categoryId: number,
): string {
    const min = findPolicy(policies, 'min_time', categoryId);
    return msToInput(min ? (num(min.value.minTimeMs) ?? null) : null);
}

function gtInputFromPolicies(
    policies: BoardPolicyRow[],
    categoryId: number,
): string {
    const min = findPolicy(policies, 'min_time', categoryId);
    return msToInput(min ? (num(min.value.minGameTimeMs) ?? null) : null);
}

export function Standards({ gameSlug, gameDisplay, category, canEdit }: Props) {
    const categoryId = category.id;
    const [policies, setPolicies] = useState<BoardPolicyRow[]>([]);
    const [minInput, setMinInput] = useState('');
    const [originalMinInput, setOriginalMinInput] = useState('');
    const [gtInput, setGtInput] = useState('');
    const [originalGtInput, setOriginalGtInput] = useState('');
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
            const min = minInputFromPolicies(res.policies, catId);
            const gt = gtInputFromPolicies(res.policies, catId);
            setMinInput(min);
            setOriginalMinInput(min);
            setGtInput(gt);
            setOriginalGtInput(gt);
            setLoading(false);
        },
        [gameSlug],
    );

    // Load policies + roster whenever the selected category changes.
    useEffect(() => {
        void loadForCategory(categoryId);
        startRosterLoad(async () => {
            const res = await loadRosterAction(gameSlug, categoryId, {});
            setRoster('error' in res ? [] : res.rows);
        });
    }, [categoryId, gameSlug, loadForCategory]);

    const dirty = minInput !== originalMinInput || gtInput !== originalGtInput;

    const handleReset = () => {
        setMinInput(originalMinInput);
        setGtInput(originalGtInput);
        setError(null);
    };

    const handleSave = () => {
        setError(null);

        const minRt = parseTime(minInput);
        if (Number.isNaN(minRt)) {
            setError(
                'Time must be in h:mm:ss, m:ss, or m:ss.SSS format and greater than zero.',
            );
            return;
        }

        const minGt = parseTime(gtInput);
        if (Number.isNaN(minGt)) {
            setError(
                'In-game time must be in h:mm:ss, m:ss, or m:ss.SSS format and greater than zero.',
            );
            return;
        }

        const cid = categoryId;

        startSaving(async () => {
            // The minimum time maps to a single min_time policy: create it,
            // update it, or delete it depending on the fields and what exists.
            type ActionResult =
                | { ok: true }
                | { ok: true; policy: BoardPolicyRow }
                | { error: string };

            const existing = findPolicy(policies, 'min_time', cid);
            let op: (() => Promise<ActionResult>) | null = null;

            // Include each key only when its input is set, so an RT-only save
            // still produces `{ minTimeMs }` exactly as before.
            const nextValue: { minTimeMs?: number; minGameTimeMs?: number } =
                {};
            if (minRt != null) nextValue.minTimeMs = minRt;
            if (minGt != null) nextValue.minGameTimeMs = minGt;

            if (minRt == null && minGt == null) {
                if (existing) {
                    op = () => deletePolicyAction(gameSlug, existing.id);
                }
            } else if (existing) {
                if (
                    num(existing.value.minTimeMs) !== minRt ||
                    num(existing.value.minGameTimeMs) !== minGt
                ) {
                    op = () =>
                        updatePolicyAction(gameSlug, existing.id, nextValue);
                }
            } else {
                const input: CreatePolicyInput = {
                    policyType: 'min_time',
                    value: nextValue,
                    categoryId: cid,
                };
                op = () => createPolicyAction(gameSlug, input);
            }

            if (!op) {
                toast.info('No changes to save.');
                return;
            }

            const res = await op();
            if ('error' in res) {
                setError(res.error);
                // Reload to resync with whatever did persist.
                await loadForCategory(cid);
                return;
            }

            toast.success('Minimum time saved.');
            await loadForCategory(cid);
        });
    };

    // ── Live preview (client-side, reflects the UNSAVED field values) ──────
    const minRtPreview = parseTime(minInput);
    const minMs =
        minRtPreview != null && !Number.isNaN(minRtPreview)
            ? minRtPreview
            : null;
    const minGtPreview = parseTime(gtInput);
    const gtMs =
        minGtPreview != null && !Number.isNaN(minGtPreview)
            ? minGtPreview
            : null;
    const belowMin =
        minMs == null && gtMs == null
            ? []
            : roster.filter(
                  (r) =>
                      (minMs != null && r.time != null && r.time < minMs) ||
                      (gtMs != null && r.gameTime != null && r.gameTime < gtMs),
              );

    return (
        <section className="mb-4">
            <h2 className="h5 mb-1">Minimum time</h2>
            <p className="text-muted small mb-3">
                Set the minimum time for <strong>{category.display}</strong> in{' '}
                {gameDisplay}. Changes apply once you save.
            </p>

            {loading ? (
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
                                value={minInput}
                                onChange={(e) => setMinInput(e.target.value)}
                                placeholder="e.g. 0:30 (none = no minimum)"
                                disabled={!canEdit || isSaving}
                            />
                        </div>
                        <div className="col-md-4">
                            <label
                                htmlFor="std-min-gt"
                                className="form-label small mb-1"
                            >
                                In-game time minimum
                            </label>
                            <input
                                id="std-min-gt"
                                type="text"
                                className="form-control form-control-sm"
                                value={gtInput}
                                onChange={(e) => setGtInput(e.target.value)}
                                placeholder="e.g. 0:30 (none = no minimum)"
                                disabled={!canEdit || isSaving}
                            />
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
                                    With this minimum:{' '}
                                    <strong>{belowMin.length}</strong> run
                                    {belowMin.length === 1 ? '' : 's'} below
                                    minimum.
                                </div>
                                {belowMin.length > 0 && (
                                    <button
                                        type="button"
                                        className="btn btn-link btn-sm px-0"
                                        onClick={() =>
                                            setShowSamples((v) => !v)
                                        }
                                    >
                                        {showSamples
                                            ? 'Hide affected runs'
                                            : `Show affected runs (${belowMin.length})`}
                                    </button>
                                )}
                                {showSamples && belowMin.length > 0 && (
                                    <ul className="list-unstyled small mb-0 mt-1">
                                        {belowMin.slice(0, 50).map((r) => (
                                            <li key={r.runId}>
                                                {r.runnerName} —{' '}
                                                {r.time != null ? (
                                                    <DurationToFormatted
                                                        duration={r.time}
                                                        withMillis
                                                    />
                                                ) : (
                                                    '—'
                                                )}
                                                {gtMs != null && (
                                                    <>
                                                        {' '}
                                                        (IGT{' '}
                                                        {r.gameTime != null ? (
                                                            <DurationToFormatted
                                                                duration={
                                                                    r.gameTime
                                                                }
                                                                withMillis
                                                            />
                                                        ) : (
                                                            '—'
                                                        )}
                                                        )
                                                    </>
                                                )}{' '}
                                                <span className="text-muted">
                                                    (below minimum)
                                                </span>
                                            </li>
                                        ))}
                                        {belowMin.length > 50 && (
                                            <li className="text-muted">
                                                …and {belowMin.length - 50} more
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
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={handleSave}
                                    disabled={isSaving || !dirty}
                                >
                                    {isSaving ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={handleReset}
                                    disabled={isSaving || !dirty}
                                >
                                    Reset
                                </button>
                            </div>
                            {error && (
                                <div className="alert alert-danger mt-2 mb-0 py-2">
                                    {error}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-muted small mt-3 mb-0">
                            Only board-admins can change the minimum time.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}
