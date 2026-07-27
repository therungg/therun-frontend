'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check2 } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import { RULES_STARTER_TEMPLATE } from '~src/lib/setup/rules-template';
import { formatTimeInput, parseTimeInput } from '~src/lib/time-input';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
import {
    createPolicyAction,
    deletePolicyAction,
    updatePolicyAction,
} from '../../manage/moderation/policies/actions/policies-actions.action';
import { updateTimingSettingsAction } from '../../manage/timing/actions/update-timing-settings.action';
import {
    CategoryLeaderboardPreview,
    type PreviewDraft,
} from '../category-leaderboard-preview';
import styles from '../setup.module.scss';
import type { StepProps, WizardData } from '../types';
import { StepHeader } from './step-header';

function toPrimaryTiming(short: 'rt' | 'gt'): PrimaryTiming {
    return short === 'gt' ? 'gametime' : 'realtime';
}

interface MinTimeValue {
    minTimeMs?: number | null;
    minGameTimeMs?: number | null;
}

// categoryId null = the game-wide minimum from the defaults step; a
// category-scoped policy beats it (mirrors backend getMinimumTime).
function minPolicyFor(
    policies: BoardPolicyRow[],
    categoryId: number | null,
): BoardPolicyRow | undefined {
    return policies.find(
        (p) =>
            p.policyType === 'min_time' &&
            p.categoryId === categoryId &&
            p.subcategoryKey === null,
    );
}

interface MinRowState {
    catId: number;
    /** 'rt' writes minTimeMs, 'gt' writes minGameTimeMs. */
    primary: 'rt' | 'gt';
    text: string;
    initialText: string;
    policyId: number | null;
    existing: MinTimeValue;
    error: string | null;
}

export function StepExceptions({ data, onAdvance }: StepProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const mains = data.categories
        .filter((c) => !c.archived && (c.isMain ?? false))
        .sort(
            (a, b) =>
                (b.totalFinishedAttemptCount ?? 0) -
                (a.totalFinishedAttemptCount ?? 0),
        );

    const catParam = searchParams.get('cat');
    const [openId, setOpenId] = useState<number | null>(
        catParam ? Number(catParam) : null,
    );

    const gameMin = (minPolicyFor(data.policies, null)?.value ??
        null) as MinTimeValue | null;
    const [minRows, setMinRows] = useState<MinRowState[]>(() =>
        mains.map((c) => {
            const policy = minPolicyFor(data.policies, c.id);
            const existing = (policy?.value ?? {}) as MinTimeValue;
            const primary = c.primaryTiming === 'gt' ? 'gt' : 'rt';
            const ms =
                primary === 'gt' ? existing.minGameTimeMs : existing.minTimeMs;
            const text = ms ? formatTimeInput(ms) : '';
            return {
                catId: c.id,
                primary,
                text,
                initialText: text,
                policyId: policy?.id ?? null,
                existing,
                error: null,
            };
        }),
    );
    const [progress, setProgress] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const setMinText = (catId: number, text: string) =>
        setMinRows((rs) =>
            rs.map((r) =>
                r.catId === catId ? { ...r, text, error: null } : r,
            ),
        );

    const gameMinMs = gameMin?.minTimeMs ?? gameMin?.minGameTimeMs ?? null;
    const minPlaceholder = gameMinMs
        ? `${formatTimeInput(gameMinMs)} (game-wide)`
        : 'e.g. 10:00';

    const changedMinRows = minRows.filter(
        (r) => r.text.trim() !== r.initialText.trim(),
    );

    const saveAndContinue = () => {
        const invalidIds = minRows
            .filter((r) => r.text.trim() && !parseTimeInput(r.text))
            .map((r) => r.catId);
        if (invalidIds.length > 0) {
            setMinRows((rs) =>
                rs.map((r) =>
                    invalidIds.includes(r.catId)
                        ? { ...r, error: 'Use h:mm:ss or m:ss.' }
                        : r,
                ),
            );
            return;
        }
        startSaving(async () => {
            // Sequential batch, same pattern as the triage save: per-row
            // errors stay on their row, advance only when everything saved.
            let failures = 0;
            for (let i = 0; i < changedMinRows.length; i++) {
                const r = changedMinRows[i];
                setProgress(
                    `Saving minimums ${i + 1} / ${changedMinRows.length}…`,
                );
                const field =
                    r.primary === 'gt' ? 'minGameTimeMs' : 'minTimeMs';
                const otherField =
                    r.primary === 'gt' ? 'minTimeMs' : 'minGameTimeMs';
                const otherValue = r.existing[otherField] ?? null;
                const parsed = r.text.trim()
                    ? parseTimeInput(r.text)
                    : undefined;

                let res:
                    | { error: string }
                    | { ok: true; policy: BoardPolicyRow }
                    | { ok: true };
                let nextPolicyId: number | null = r.policyId;
                if (parsed) {
                    const value: Record<string, unknown> = { [field]: parsed };
                    if (otherValue) value[otherField] = otherValue;
                    res = r.policyId
                        ? await updatePolicyAction(
                              data.game.name,
                              r.policyId,
                              value,
                          )
                        : await createPolicyAction(data.game.name, {
                              policyType: 'min_time',
                              value,
                              categoryId: r.catId,
                          });
                    if (!('error' in res) && 'policy' in res) {
                        nextPolicyId = res.policy.id;
                    }
                } else if (r.policyId) {
                    // Cleared: keep the policy if the other timing still has
                    // a minimum, otherwise drop it (game-wide takes over).
                    if (otherValue) {
                        res = await updatePolicyAction(
                            data.game.name,
                            r.policyId,
                            { [otherField]: otherValue },
                        );
                    } else {
                        res = await deletePolicyAction(
                            data.game.name,
                            r.policyId,
                        );
                        nextPolicyId = null;
                    }
                } else {
                    continue;
                }

                if ('error' in res) {
                    failures++;
                    const message = res.error;
                    setMinRows((rs) =>
                        rs.map((row) =>
                            row.catId === r.catId
                                ? { ...row, error: message }
                                : row,
                        ),
                    );
                } else {
                    setMinRows((rs) =>
                        rs.map((row) =>
                            row.catId === r.catId
                                ? {
                                      ...row,
                                      policyId: nextPolicyId,
                                      initialText: row.text,
                                  }
                                : row,
                        ),
                    );
                }
            }
            setProgress(null);
            if (failures === 0) onAdvance();
        });
    };

    if (mains.length === 0) {
        return (
            <section>
                <StepHeader
                    step="exceptions"
                    title="Per-category exceptions"
                    lede="Pick your featured categories first, then set any per-category overrides here."
                />
                <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={() => {
                        router.replace(
                            `/games-v2/${data.game.name}/setup?step=categories`,
                            { scroll: true },
                        );
                        router.refresh();
                    }}
                >
                    Choose categories
                </button>
            </section>
        );
    }

    return (
        <section>
            <StepHeader
                step="exceptions"
                title="Minimum times & exceptions"
                lede="Set a minimum time per category: anything faster is held for review. Timers auto-submit a lot of junk runs, so this is your main defense. Open a category only if its timing or rules should differ from the defaults."
            />
            <ul className={styles.rows}>
                {mains.map((c) => {
                    const row = minRows.find((r) => r.catId === c.id);
                    return (
                        <li key={c.id} className={styles.rowItem}>
                            <strong>{c.display}</strong>
                            <span className="text-muted small">
                                {c.primaryTiming === 'gt' ? 'IGT' : 'RTA'}
                                {(c.showMilliseconds ?? true) ? ' · ms' : ''}
                                {(c.requireVideo ?? false) ? ' · video' : ''}
                            </span>
                            {(c.rules ?? '').trim() ? (
                                <span className={styles.textSuccess}>
                                    <Check2 size={14} aria-hidden /> rules
                                </span>
                            ) : (
                                <span className={styles.textWarning}>
                                    no rules
                                </span>
                            )}
                            {row && (
                                <span className="d-flex align-items-center gap-1 small ms-auto">
                                    <label
                                        htmlFor={`min-${c.id}`}
                                        className="text-muted"
                                    >
                                        min
                                    </label>
                                    <input
                                        id={`min-${c.id}`}
                                        className="form-control form-control-sm"
                                        style={{ width: '7.5rem' }}
                                        value={row.text}
                                        disabled={isSaving}
                                        onChange={(e) =>
                                            setMinText(c.id, e.target.value)
                                        }
                                        placeholder={minPlaceholder}
                                        aria-label={`Minimum ${
                                            c.primaryTiming === 'gt'
                                                ? 'in-game'
                                                : 'real'
                                        } time for ${c.display}`}
                                    />
                                </span>
                            )}
                            {row?.error && (
                                <span
                                    className={`${styles.textDanger} small w-100 text-end`}
                                >
                                    {row.error}
                                </span>
                            )}
                            <button
                                type="button"
                                className="btn btn-link btn-sm"
                                onClick={() =>
                                    setOpenId((id) =>
                                        id === c.id ? null : c.id,
                                    )
                                }
                            >
                                {openId === c.id ? 'Close' : 'Adjust'}
                            </button>
                        </li>
                    );
                })}
            </ul>
            <p className="text-muted small">
                Minimums use each category’s primary timing.{' '}
                {gameMinMs
                    ? 'Empty fields fall back to the game-wide minimum from the previous step.'
                    : 'You can also set one game-wide minimum in the previous step.'}
            </p>
            {openId !== null &&
                (() => {
                    const cat = mains.find((c) => c.id === openId);
                    return cat ? (
                        <CategoryOverride
                            key={cat.id}
                            data={data}
                            category={cat}
                        />
                    ) : null;
                })()}
            {progress && <div className="text-muted small">{progress}</div>}
            <button
                type="button"
                className={`${styles.primaryAction} mt-2`}
                disabled={isSaving}
                onClick={saveAndContinue}
            >
                {isSaving
                    ? 'Saving…'
                    : changedMinRows.length > 0
                      ? 'Save minimums & continue'
                      : openId === null
                        ? 'No exceptions needed'
                        : 'Continue'}
            </button>
        </section>
    );
}

function CategoryOverride({
    data,
    category,
}: {
    data: WizardData;
    category: ResolvedCategory;
}) {
    const [primaryTiming, setPrimaryTiming] = useState<PrimaryTiming>(
        toPrimaryTiming(category.primaryTiming),
    );
    const [hideRealTime, setHideRealTime] = useState(
        category.hideRealTime ?? false,
    );
    const [hideGameTime, setHideGameTime] = useState(
        category.hideGameTime ?? false,
    );
    const [showMilliseconds, setShowMilliseconds] = useState(
        category.showMilliseconds ?? true,
    );
    const [rules, setRules] = useState(
        category.rules?.trim() ? category.rules : RULES_STARTER_TEMPLATE,
    );
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const bothHidden = hideRealTime && hideGameTime;

    const draft: PreviewDraft = {
        primaryTiming,
        hideRealTime,
        hideGameTime,
        showMilliseconds,
        minTimeMs: null,
        minGameTimeMs: null,
        requireVideo: category.requireVideo ?? false,
    };

    const save = () => {
        startSaving(async () => {
            setError(null);
            const timingRes = await updateTimingSettingsAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: category.id,
                primaryTiming,
                hideRealTime,
                hideGameTime,
            });
            const settingsRes = await updateCategorySettingsAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: category.id,
                showMilliseconds,
                rules,
            });
            if ('error' in timingRes || 'error' in settingsRes) {
                setError(
                    ('error' in timingRes && timingRes.error) ||
                        ('error' in settingsRes && settingsRes.error) ||
                        'Save failed',
                );
                return;
            }
            toast.success(`${category.display} saved`);
        });
    };

    return (
        <div className={styles.section}>
            <h3 className="h6">{category.display} override</h3>
            <div className="row">
                <div className="col-lg-7">
                    <div className="row g-3 align-items-end mb-3">
                        <div className="col-auto">
                            <label
                                className="form-label small mb-1"
                                htmlFor={`ex-primary-${category.id}`}
                            >
                                Primary
                            </label>
                            <select
                                id={`ex-primary-${category.id}`}
                                className="form-select form-select-sm"
                                value={primaryTiming}
                                onChange={(e) =>
                                    setPrimaryTiming(
                                        e.target.value as PrimaryTiming,
                                    )
                                }
                            >
                                <option value="realtime">RTA</option>
                                <option value="gametime">IGT</option>
                            </select>
                        </div>
                        <div className="col-auto form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id={`ex-showrt-${category.id}`}
                                checked={!hideRealTime}
                                onChange={(e) =>
                                    setHideRealTime(!e.target.checked)
                                }
                            />
                            <label
                                className="form-check-label"
                                htmlFor={`ex-showrt-${category.id}`}
                            >
                                Show RT
                            </label>
                        </div>
                        <div className="col-auto form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id={`ex-showigt-${category.id}`}
                                checked={!hideGameTime}
                                onChange={(e) =>
                                    setHideGameTime(!e.target.checked)
                                }
                            />
                            <label
                                className="form-check-label"
                                htmlFor={`ex-showigt-${category.id}`}
                            >
                                Show IGT
                            </label>
                        </div>
                        <div className="col-auto form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id={`ex-ms-${category.id}`}
                                checked={showMilliseconds}
                                onChange={(e) =>
                                    setShowMilliseconds(e.target.checked)
                                }
                            />
                            <label
                                className="form-check-label"
                                htmlFor={`ex-ms-${category.id}`}
                            >
                                Milliseconds
                            </label>
                        </div>
                    </div>
                    <label
                        className="form-label small mb-1"
                        htmlFor={`ex-rules-${category.id}`}
                    >
                        Rules
                    </label>
                    <textarea
                        id={`ex-rules-${category.id}`}
                        className="form-control font-monospace"
                        rows={7}
                        value={rules}
                        onChange={(e) => setRules(e.target.value)}
                    />
                    {bothHidden && (
                        <div className={`${styles.errorNote} mt-2 mb-0`}>
                            A category can’t hide both RT and IGT.
                        </div>
                    )}
                    {error && (
                        <div className={`${styles.errorNote} mt-2 mb-0`}>
                            {error}
                        </div>
                    )}
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary mt-2"
                        disabled={isSaving || bothHidden}
                        onClick={save}
                    >
                        {isSaving ? 'Saving…' : 'Save override'}
                    </button>
                </div>
                <div className="col-lg-5">
                    <CategoryLeaderboardPreview
                        gameSlug={data.game.name}
                        categorySlug={category.name}
                        draft={draft}
                    />
                </div>
            </div>
        </div>
    );
}
