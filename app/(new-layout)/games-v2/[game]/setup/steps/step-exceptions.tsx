'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check2 } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import { RULES_STARTER_TEMPLATE } from '~src/lib/setup/rules-template';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
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

    if (mains.length === 0) {
        return (
            <section>
                <StepHeader
                    num={4}
                    title="Per-category exceptions"
                    lede="Pick your featured categories first — then any category that differs from the defaults gets its override here."
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
                num={4}
                title={`${mains.length} categor${
                    mains.length === 1 ? 'y uses' : 'ies use'
                } your defaults — any different?`}
                lede="Open a category only if its timing or rules differ from the rest. Deeper settings — variables, minimum times — live in the console."
            />
            <ul className={styles.rows}>
                {mains.map((c) => (
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
                            <span className={styles.textWarning}>no rules</span>
                        )}
                        <button
                            type="button"
                            className="btn btn-link btn-sm ms-auto"
                            onClick={() =>
                                setOpenId((id) => (id === c.id ? null : c.id))
                            }
                        >
                            {openId === c.id ? 'Close' : 'Adjust'}
                        </button>
                    </li>
                ))}
            </ul>
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
            <button
                type="button"
                className={`${styles.primaryAction} mt-2`}
                onClick={onAdvance}
            >
                {openId === null
                    ? 'They’re all the same — continue'
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
