'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import { RULES_STARTER_TEMPLATE } from '~src/lib/setup/rules-template';
import { formatTimeInput, parseTimeInput } from '~src/lib/time-input';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
import {
    createPolicyAction,
    deletePolicyAction,
    updatePolicyAction,
} from '../../manage/moderation/policies/actions/policies-actions.action';
import { updateTimingSettingsAction } from '../../manage/timing/actions/update-timing-settings.action';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

export function StepDefaults({ data, onAdvance }: StepProps) {
    const mains = data.categories.filter(
        (c) => !c.archived && (c.isMain ?? false),
    );

    const [primaryTiming, setPrimaryTiming] =
        useState<PrimaryTiming>('realtime');
    const [showRt, setShowRt] = useState(true);
    const [showIgt, setShowIgt] = useState(true);
    const [showMilliseconds, setShowMilliseconds] = useState(true);
    const [requireVideo, setRequireVideo] = useState(false);
    const [topNOnly, setTopNOnly] = useState(false);
    const [topN, setTopN] = useState('5');
    const [enablePolicy, setEnablePolicy] = useState(true);
    const [rulesEnabled, setRulesEnabled] = useState(true);
    const [rules, setRules] = useState(RULES_STARTER_TEMPLATE);

    // Game-wide minimum time = the categoryId-null min_time policy. A
    // category-scoped one (next step) beats it, mirroring enforcement.
    const gameMinPolicy = data.policies.find(
        (p) =>
            p.policyType === 'min_time' &&
            p.categoryId === null &&
            p.subcategoryKey === null,
    );
    const gameMinValue = (gameMinPolicy?.value ?? {}) as {
        minTimeMs?: number | null;
        minGameTimeMs?: number | null;
    };
    const [minPolicyId, setMinPolicyId] = useState<number | null>(
        gameMinPolicy?.id ?? null,
    );
    const [minEnabled, setMinEnabled] = useState(gameMinPolicy != null);
    const [minTimeText, setMinTimeText] = useState(
        gameMinValue.minTimeMs ? formatTimeInput(gameMinValue.minTimeMs) : '',
    );
    const [minGameTimeText, setMinGameTimeText] = useState(
        gameMinValue.minGameTimeMs
            ? formatTimeInput(gameMinValue.minGameTimeMs)
            : '',
    );

    const [guardError, setGuardError] = useState<string | null>(null);
    const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
    const [progress, setProgress] = useState<string | null>(null);
    const [isApplying, startApplying] = useTransition();
    const [policyCreated, setPolicyCreated] = useState(false);

    const mainsWithoutRules = mains.filter((c) => !(c.rules ?? '').trim());

    if (mains.length === 0) {
        return (
            <section>
                <StepHeader
                    num={3}
                    title="Set the rules once"
                    lede="Pick your featured categories first, then come back here."
                />
                <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={onAdvance}
                >
                    Continue
                </button>
            </section>
        );
    }

    const apply = () => {
        setGuardError(null);

        if (!showRt && !showIgt) {
            setGuardError(
                'A category can’t hide both real time and in-game time — turn at least one back on.',
            );
            return;
        }
        if (
            requireVideo &&
            topNOnly &&
            (!Number.isInteger(Number(topN)) || Number(topN) <= 0)
        ) {
            setGuardError('Top N must be a positive whole number.');
            return;
        }

        let minValue: { minTimeMs?: number; minGameTimeMs?: number } | null =
            null;
        if (minEnabled) {
            minValue = {};
            if (minTimeText.trim()) {
                const ms = parseTimeInput(minTimeText);
                if (!ms || ms <= 0) {
                    setGuardError('Enter the minimum time as h:mm:ss or m:ss.');
                    return;
                }
                minValue.minTimeMs = ms;
            }
            if (minGameTimeText.trim()) {
                const ms = parseTimeInput(minGameTimeText);
                if (!ms || ms <= 0) {
                    setGuardError(
                        'Enter the in-game minimum as h:mm:ss or m:ss.',
                    );
                    return;
                }
                minValue.minGameTimeMs = ms;
            }
            if (
                minValue.minTimeMs === undefined &&
                minValue.minGameTimeMs === undefined
            ) {
                setGuardError(
                    'Set a minimum time value, or untick the minimum-time row.',
                );
                return;
            }
        }

        startApplying(async () => {
            const newErrors: Record<number, string> = {};

            for (let i = 0; i < mains.length; i++) {
                const cat = mains[i];
                setProgress(`Applying ${i + 1} / ${mains.length}…`);

                const timingRes = await updateTimingSettingsAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: cat.id,
                    primaryTiming,
                    hideRealTime: !showRt,
                    hideGameTime: !showIgt,
                });
                if ('error' in timingRes) {
                    newErrors[cat.id] = timingRes.error;
                }

                const writeRules =
                    rulesEnabled && !(cat.rules ?? '').trim() && rules.trim();
                const settingsRes = await updateCategorySettingsAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: cat.id,
                    showMilliseconds,
                    requireVideo,
                    requireVideoTopN:
                        requireVideo && topNOnly ? Number(topN) : null,
                    ...(writeRules ? { rules } : {}),
                });
                if ('error' in settingsRes) {
                    newErrors[cat.id] = newErrors[cat.id]
                        ? `${newErrors[cat.id]}; ${settingsRes.error}`
                        : settingsRes.error;
                }
            }
            setProgress(null);
            setRowErrors(newErrors);

            let policyFailed = false;
            if (enablePolicy) {
                const alreadyConfigured =
                    policyCreated ||
                    data.policies.some(
                        (p) =>
                            p.policyType === 'auto_flag_faster_than_wr_pct' &&
                            p.categoryId === null,
                    );
                if (!alreadyConfigured) {
                    const res = await createPolicyAction(data.game.name, {
                        policyType: 'auto_flag_faster_than_wr_pct',
                        value: { pct: 5 },
                        categoryId: null,
                    });
                    if ('error' in res) {
                        setGuardError(res.error);
                        policyFailed = true;
                    } else {
                        setPolicyCreated(true);
                    }
                }
            }

            let minFailed = false;
            if (minEnabled && minValue) {
                const res = minPolicyId
                    ? await updatePolicyAction(
                          data.game.name,
                          minPolicyId,
                          minValue,
                      )
                    : await createPolicyAction(data.game.name, {
                          policyType: 'min_time',
                          value: minValue,
                          categoryId: null,
                      });
                if ('error' in res) {
                    setGuardError(res.error);
                    minFailed = true;
                } else {
                    setMinPolicyId(res.policy.id);
                }
            } else if (!minEnabled && minPolicyId) {
                const res = await deletePolicyAction(
                    data.game.name,
                    minPolicyId,
                );
                if ('error' in res) {
                    setGuardError(res.error);
                    minFailed = true;
                } else {
                    setMinPolicyId(null);
                }
            }

            if (
                Object.keys(newErrors).length === 0 &&
                !policyFailed &&
                !minFailed
            ) {
                toast.success(
                    `Defaults applied to ${mains.length} featured categor${
                        mains.length === 1 ? 'y' : 'ies'
                    }`,
                );
                onAdvance();
            }
        });
    };

    return (
        <section>
            <StepHeader
                num={3}
                title="Set the rules once"
                lede={`These get applied to all ${mains.length} featured categor${
                    mains.length === 1 ? 'y' : 'ies'
                } in one go. If one category works differently, you can override it in the next step.`}
            />

            <div className={styles.section}>
                <h3 className="h6">Timing</h3>
                <div className="row g-3 align-items-end">
                    <div className="col-auto">
                        <label
                            className="form-label small mb-1"
                            htmlFor="defaults-primary"
                        >
                            Primary
                        </label>
                        <select
                            id="defaults-primary"
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
                            id="defaults-showrt"
                            checked={showRt}
                            onChange={(e) => setShowRt(e.target.checked)}
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-showrt"
                        >
                            Show RT
                        </label>
                    </div>
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-showigt"
                            checked={showIgt}
                            onChange={(e) => setShowIgt(e.target.checked)}
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-showigt"
                        >
                            Show IGT
                        </label>
                    </div>
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-ms"
                            checked={showMilliseconds}
                            onChange={(e) =>
                                setShowMilliseconds(e.target.checked)
                            }
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-ms"
                        >
                            Milliseconds
                        </label>
                    </div>
                </div>
            </div>

            <div className={styles.section}>
                <h3 className="h6">Proof & review</h3>
                <div className="form-check">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        id="defaults-video"
                        checked={requireVideo}
                        onChange={(e) => setRequireVideo(e.target.checked)}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="defaults-video"
                    >
                        <strong>Require video proof</strong>
                    </label>
                </div>
                {requireVideo && (
                    <div className="mt-2 ms-4">
                        <label className="form-check-label">
                            <input
                                type="checkbox"
                                className="form-check-input me-2"
                                checked={topNOnly}
                                onChange={(e) => setTopNOnly(e.target.checked)}
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
                <div className="form-check mt-2">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        id="defaults-policy"
                        checked={enablePolicy}
                        onChange={(e) => setEnablePolicy(e.target.checked)}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="defaults-policy"
                    >
                        <strong>Hold suspicious runs for review</strong>{' '}
                        <span className="text-muted small">
                            anything beating the world record by 5%+ waits for a
                            mod
                        </span>
                    </label>
                </div>
            </div>

            <div className={styles.section}>
                <h3 className="h6">Minimum time</h3>
                <div className="form-check">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        id="defaults-min"
                        checked={minEnabled}
                        onChange={(e) => setMinEnabled(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="defaults-min">
                        <strong>Hold impossibly fast runs</strong>{' '}
                        <span className="text-muted small">
                            anything under the minimum waits for a mod
                        </span>
                    </label>
                </div>
                {minEnabled && (
                    <>
                        <div className="mt-2 ms-4 d-flex gap-3 flex-wrap align-items-end">
                            <div>
                                <label
                                    className="form-label small mb-1"
                                    htmlFor="defaults-min-rt"
                                >
                                    Real time
                                </label>
                                <input
                                    id="defaults-min-rt"
                                    className="form-control form-control-sm"
                                    style={{ width: '7rem' }}
                                    value={minTimeText}
                                    onChange={(e) =>
                                        setMinTimeText(e.target.value)
                                    }
                                    placeholder="e.g. 10:00"
                                />
                            </div>
                            <div>
                                <label
                                    className="form-label small mb-1"
                                    htmlFor="defaults-min-igt"
                                >
                                    In-game time{' '}
                                    <span className="text-muted">
                                        (optional)
                                    </span>
                                </label>
                                <input
                                    id="defaults-min-igt"
                                    className="form-control form-control-sm"
                                    style={{ width: '7rem' }}
                                    value={minGameTimeText}
                                    onChange={(e) =>
                                        setMinGameTimeText(e.target.value)
                                    }
                                    placeholder="e.g. 8:00"
                                />
                            </div>
                        </div>
                        <p className="text-muted small mt-2 mb-0 ms-4">
                            Applies to the whole game. The next step can set a
                            different minimum per category.
                        </p>
                    </>
                )}
            </div>

            <div className={styles.section}>
                <h3 className="h6">Board rules</h3>
                <div className="form-check mb-2">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        id="defaults-rules"
                        checked={rulesEnabled}
                        onChange={(e) => setRulesEnabled(e.target.checked)}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="defaults-rules"
                    >
                        <strong>Start every category from this template</strong>
                    </label>
                </div>
                {rulesEnabled && (
                    <>
                        <p className="text-muted small mb-2">
                            Fill in the [brackets].{' '}
                            {mains.length - mainsWithoutRules.length > 0 &&
                                'Categories that already have rules keep them.'}
                        </p>
                        <textarea
                            className="form-control font-monospace"
                            rows={7}
                            value={rules}
                            onChange={(e) => setRules(e.target.value)}
                        />
                    </>
                )}
            </div>

            {guardError && <div className={styles.errorNote}>{guardError}</div>}
            {Object.entries(rowErrors).map(([id, msg]) => (
                <div key={id} className={styles.errorNote}>
                    {mains.find((c) => c.id === Number(id))?.display}: {msg}
                </div>
            ))}
            {progress && <div className="text-muted small">{progress}</div>}
            <button
                type="button"
                className={`${styles.primaryAction} mt-2`}
                disabled={isApplying}
                onClick={apply}
            >
                {isApplying
                    ? 'Applying…'
                    : `Apply to all ${mains.length} & continue`}
            </button>
        </section>
    );
}
