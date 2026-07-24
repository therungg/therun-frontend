'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import { RULES_STARTER_TEMPLATE } from '~src/lib/setup/rules-template';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
import { createPolicyAction } from '../../manage/moderation/policies/actions/policies-actions.action';
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
                    lede="Defaults apply to your featured categories — pick those first, then come back here."
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

            if (Object.keys(newErrors).length === 0 && !policyFailed) {
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
                lede={`These defaults apply to all ${mains.length} featured categor${
                    mains.length === 1 ? 'y' : 'ies'
                }. The next step handles any category that differs.`}
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
                            Replace the [bracketed] parts.{' '}
                            {mains.length - mainsWithoutRules.length > 0 &&
                                `${
                                    mains.length - mainsWithoutRules.length
                                } categor${
                                    mains.length - mainsWithoutRules.length ===
                                    1
                                        ? 'y'
                                        : 'ies'
                                } already ${
                                    mains.length - mainsWithoutRules.length ===
                                    1
                                        ? 'has'
                                        : 'have'
                                } rules — they keep theirs.`}
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
