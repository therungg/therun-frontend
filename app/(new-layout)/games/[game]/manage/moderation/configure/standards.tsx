'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationField } from '~src/components/time-input/duration-field';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import type {
    BoardPolicyRow,
    CreatePolicyInput,
    LeaderboardRosterRow,
    PolicyType,
} from '../../../../../../../types/moderation.types';
import { FormSection, InlineError, SectionFooter } from '../../shared/form-kit';
import kit from '../../shared/form-kit.module.scss';
import {
    createPolicyAction,
    deletePolicyAction,
    updatePolicyAction,
} from '../policies/actions/policies-actions.action';
import { loadRosterAction } from '../roster/actions/load-roster.action';
import { loadStandardsAction } from './actions/standards.action';
import styles from './standards.module.scss';

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

function minMsFromPolicies(
    policies: BoardPolicyRow[],
    categoryId: number,
    timing: 'rt' | 'gt',
): number | null {
    const min = findPolicy(policies, 'min_time', categoryId);
    if (!min) return null;
    const bound =
        timing === 'gt' ? min.value.minGameTimeMs : min.value.minTimeMs;
    return num(bound) ?? null;
}

export function Standards({ gameSlug, gameDisplay, category, canEdit }: Props) {
    const categoryId = category.id;
    // One minimum, bound to the category's primary timing — same fallback
    // rule as the board (board-curation.tsx): anything but 'gt' means 'rt'.
    const timing: 'rt' | 'gt' = category.primaryTiming === 'gt' ? 'gt' : 'rt';
    const [policies, setPolicies] = useState<BoardPolicyRow[]>([]);
    const [minMs, setMinMs] = useState<number | null>(null);
    const [originalMinMs, setOriginalMinMs] = useState<number | null>(null);
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
            const min = minMsFromPolicies(res.policies, catId, timing);
            setMinMs(min);
            setOriginalMinMs(min);
            setLoading(false);
        },
        [gameSlug, timing],
    );

    // Load policies + roster whenever the selected category changes.
    useEffect(() => {
        void loadForCategory(categoryId);
        startRosterLoad(async () => {
            const res = await loadRosterAction(gameSlug, categoryId, {});
            setRoster('error' in res ? [] : res.rows);
        });
    }, [categoryId, gameSlug, loadForCategory]);

    const dirty = minMs !== originalMinMs;

    const handleReset = () => {
        setMinMs(originalMinMs);
        setError(null);
    };

    const handleSave = () => {
        setError(null);

        const cid = categoryId;

        startSaving(async () => {
            // The minimum time maps to a single min_time policy: create it,
            // update it, or delete it depending on the field and what exists.
            // The value carries ONLY the primary-timing key — a save
            // deliberately drops any leftover minimum on the other clock,
            // since there is no UI showing (or clearing) it any more.
            type ActionResult =
                | { ok: true }
                | { ok: true; policy: BoardPolicyRow }
                | { error: string };

            const existing = findPolicy(policies, 'min_time', cid);
            let op: (() => Promise<ActionResult>) | null = null;

            const boundKey = timing === 'gt' ? 'minGameTimeMs' : 'minTimeMs';

            if (minMs === null) {
                if (existing) {
                    op = () => deletePolicyAction(gameSlug, existing.id);
                }
            } else if (existing) {
                if (num(existing.value[boundKey]) !== minMs) {
                    op = () =>
                        updatePolicyAction(gameSlug, existing.id, {
                            [boundKey]: minMs,
                        });
                }
            } else {
                const input: CreatePolicyInput = {
                    policyType: 'min_time',
                    value: { [boundKey]: minMs },
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

    // ── Live preview (client-side, reflects the UNSAVED field value) ──────
    const belowMin =
        minMs == null
            ? []
            : roster.filter((r) => {
                  // Mirrors backend checkMinimumEligibility: a run without
                  // game time is held to a game-time minimum via its RTA
                  // (IGT never exceeds RTA), so RTA-fallback entries count.
                  const t = timing === 'gt' ? (r.gameTime ?? r.time) : r.time;
                  return t != null && t < minMs;
              });

    return (
        <FormSection
            title="Minimum time"
            // A minimum is optional — done when one is saved, unmarked (not
            // "needs attention") otherwise. Saved state, so it can't flip
            // while typing; absent while the initial load is in flight.
            status={!loading && originalMinMs !== null ? 'done' : undefined}
            lede={
                <>
                    Set the minimum time for <strong>{category.display}</strong>{' '}
                    in {gameDisplay}. Changes apply once you save.
                </>
            }
        >
            {loading ? (
                <p className="text-muted">Loading standards…</p>
            ) : (
                <>
                    <div className={styles.fieldCol}>
                        <div>
                            <label
                                htmlFor="std-min"
                                className="form-label small mb-1"
                            >
                                Reject{' '}
                                {timing === 'gt' ? 'in-game time' : 'real time'}{' '}
                                under
                            </label>
                            <DurationField
                                id="std-min"
                                size="sm"
                                value={minMs}
                                onChange={setMinMs}
                                disabled={!canEdit || isSaving}
                            />
                        </div>
                    </div>

                    {/* ── Live preview ─────────────────────────────────── */}
                    <div className={styles.preview}>
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
                                        {belowMin.slice(0, 50).map((r) => {
                                            const t =
                                                timing === 'gt'
                                                    ? (r.gameTime ?? r.time)
                                                    : r.time;
                                            return (
                                                <li key={r.runId}>
                                                    {r.runnerName} —{' '}
                                                    {t != null ? (
                                                        <DurationToFormatted
                                                            duration={t}
                                                            withMillis
                                                        />
                                                    ) : (
                                                        '—'
                                                    )}{' '}
                                                    <span className="text-muted">
                                                        {timing === 'gt' &&
                                                        r.gameTime == null
                                                            ? '(RTA, below minimum)'
                                                            : '(below minimum)'}
                                                    </span>
                                                </li>
                                            );
                                        })}
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
                            <SectionFooter>
                                <button
                                    type="button"
                                    className={kit.saveBtn}
                                    onClick={handleSave}
                                    disabled={isSaving || !dirty}
                                >
                                    {isSaving ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                    type="button"
                                    className={kit.resetBtn}
                                    onClick={handleReset}
                                    disabled={isSaving || !dirty}
                                >
                                    Reset
                                </button>
                            </SectionFooter>
                            <InlineError>{error}</InlineError>
                        </div>
                    ) : (
                        <p className="text-muted small mt-3 mb-0">
                            Only board-admins can change the minimum time.
                        </p>
                    )}
                </>
            )}
        </FormSection>
    );
}
