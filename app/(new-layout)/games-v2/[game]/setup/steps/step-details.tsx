'use client';

import { useRef, useState, useTransition } from 'react';
import {
    findGameMinPolicy,
    minMsFromPolicy,
    minValueForTiming,
} from '~src/lib/setup/game-minimum';
import { RULES_STARTER_TEMPLATE } from '~src/lib/setup/rules-template';
import { formatTimeInput, parseTimeInput } from '~src/lib/time-input';
import {
    createPolicyAction,
    deletePolicyAction,
    updatePolicyAction,
} from '../../manage/moderation/policies/actions/policies-actions.action';
import { updateGameMetadataAction } from '../actions/update-game-metadata.action';
import { GameDetailsForm } from '../game-details-form';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

type Timing = 'rt' | 'gt';

export function StepDetails({ data, onAdvance }: StepProps) {
    // Game-level primary timing lives on the game-metadata read path, not
    // `data.game.primaryTiming` — `resolveGame()` never populates that field
    // (it only fetches identity fields from `/v1/games/by-slug`), so it is
    // always undefined. `data.metadata` is the real source of truth here.
    const [timing, setTiming] = useState<Timing>(
        data.metadata.primaryTiming ?? 'rt',
    );
    const [rulesTemplate, setRulesTemplate] = useState(
        data.metadata.rulesTemplate ?? RULES_STARTER_TEMPLATE,
    );
    const [gameRules, setGameRules] = useState(data.metadata.gameRules ?? '');
    const [emulatorPolicy, setEmulatorPolicy] = useState<
        'allowed' | 'banned' | null
    >(data.metadata.emulatorPolicy ?? null);
    // The primary timing column is always shown — the only question is
    // whether the other clock shows next to it. One boolean survives a
    // timing flip ("show the secondary too" keeps meaning that), and the
    // server's both-hidden guard can never trip because the primary's hide
    // flag is derived as false at save time.
    const [showSecondary, setShowSecondary] = useState(() => {
        const initial: Timing = data.metadata.primaryTiming ?? 'rt';
        return initial === 'rt'
            ? !(data.metadata.hideGameTime ?? false)
            : !(data.metadata.hideRealTime ?? false);
    });

    // Game-wide minimum time = the categoryId-null min_time policy (mirrors
    // the retired defaults step). The bound key follows `timing`, never both.
    const gameMinPolicy = findGameMinPolicy(data.policies);
    const [minPolicyId, setMinPolicyId] = useState<number | null>(
        gameMinPolicy?.id ?? null,
    );
    const [minText, setMinText] = useState(() => {
        const ms = minMsFromPolicy(gameMinPolicy, timing);
        return ms ? formatTimeInput(ms) : '';
    });

    const [formBusy, setFormBusy] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [defaultsError, setDefaultsError] = useState<string | null>(null);
    const [isSavingDefaults, startSavingDefaults] = useTransition();
    // Belt-and-suspenders against a double-invoke of handleDetailsSaved (e.g.
    // a double-click landing in the gap between GameDetailsForm's own save
    // completing and isSavingDefaults flipping true). A ref is required, not
    // isSavingDefaults itself — that state update isn't visible to a second
    // synchronous call in the same tick.
    const isSavingDefaultsRef = useRef(false);

    // Switching timing relabels the field and re-reads the value bound to
    // that timing — a value typed for one binding never leaks into the other.
    const selectTiming = (next: Timing) => {
        setTiming(next);
        const ms = minMsFromPolicy(gameMinPolicy, next);
        setMinText(ms ? formatTimeInput(ms) : '');
    };

    const handleDetailsSaved = () => {
        if (isSavingDefaultsRef.current) return;

        setDefaultsError(null);

        const minMsValue = minText.trim() ? parseTimeInput(minText) : undefined;
        if (minText.trim() && (!minMsValue || minMsValue <= 0)) {
            setDefaultsError('Enter the minimum time as h:mm:ss or m:ss.');
            return;
        }

        isSavingDefaultsRef.current = true;
        startSavingDefaults(async () => {
            try {
                const metaRes = await updateGameMetadataAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    primaryTiming: timing,
                    rulesTemplate: rulesTemplate.trim() || null,
                    gameRules: gameRules.trim() || null,
                    emulatorPolicy,
                    hideRealTime: timing === 'rt' ? false : !showSecondary,
                    hideGameTime: timing === 'gt' ? false : !showSecondary,
                });
                if ('error' in metaRes) {
                    setDefaultsError(metaRes.error);
                    return;
                }

                if (minMsValue) {
                    const value = minValueForTiming(timing, minMsValue);
                    const policyRes = minPolicyId
                        ? await updatePolicyAction(
                              data.game.name,
                              minPolicyId,
                              value,
                          )
                        : await createPolicyAction(data.game.name, {
                              policyType: 'min_time',
                              value,
                              categoryId: null,
                          });
                    if ('error' in policyRes) {
                        setDefaultsError(policyRes.error);
                        return;
                    }
                    setMinPolicyId(policyRes.policy.id);
                } else if (minPolicyId) {
                    const deleteRes = await deletePolicyAction(
                        data.game.name,
                        minPolicyId,
                    );
                    if ('error' in deleteRes) {
                        setDefaultsError(deleteRes.error);
                        return;
                    }
                    setMinPolicyId(null);
                }

                onAdvance();
            } finally {
                isSavingDefaultsRef.current = false;
            }
        });
    };

    return (
        <section>
            <StepHeader step="details" title="Game details" />

            <h3 className={styles.zoneTitle}>Check the facts</h3>
            <div className={styles.section}>
                <GameDetailsForm
                    identifiers={data.identifiers}
                    metadata={data.metadata}
                    game={{
                        id: data.game.id,
                        name: data.game.name,
                        image: data.game.image ?? null,
                    }}
                    formId="game-details-form"
                    hideAction
                    canRematch={data.canRematch}
                    onBusyChange={setFormBusy}
                    onErrorChange={setFormError}
                    onSaved={handleDetailsSaved}
                />
            </div>

            <h3 className={styles.zoneTitle}>Set the ground rules</h3>
            <div className={styles.section}>
                <div className={styles.pairRow}>
                    <div>
                        <h4 className="h6">Timing</h4>
                        <div
                            className={styles.segmented}
                            role="radiogroup"
                            aria-label="Primary timing"
                        >
                            <button
                                type="button"
                                role="radio"
                                aria-checked={timing === 'rt'}
                                className={
                                    timing === 'rt'
                                        ? styles.segmentActive
                                        : undefined
                                }
                                onClick={() => selectTiming('rt')}
                            >
                                RTA
                            </button>
                            <button
                                type="button"
                                role="radio"
                                aria-checked={timing === 'gt'}
                                className={
                                    timing === 'gt'
                                        ? styles.segmentActive
                                        : undefined
                                }
                                onClick={() => selectTiming('gt')}
                            >
                                IGT
                            </button>
                        </div>
                        <p className="text-muted small mb-0">
                            The default timing method for this board’s
                            categories.
                        </p>
                    </div>
                    <div>
                        <h4 className="h6">Minimum time</h4>
                        <label
                            className="form-label small mb-1"
                            htmlFor="board-min-time"
                        >
                            {timing === 'rt'
                                ? 'Minimum real time'
                                : 'Minimum in-game time'}
                        </label>
                        <input
                            id="board-min-time"
                            className="form-control form-control-sm"
                            style={{ width: '7rem' }}
                            value={minText}
                            onChange={(e) => setMinText(e.target.value)}
                            placeholder="e.g. 10:00"
                        />
                        <p className="text-muted small mt-2 mb-0">
                            Runs under this minimum wait for a mod. Clear the
                            field to remove the limit.
                        </p>
                    </div>
                    <div>
                        <h4 className="h6">Time columns</h4>
                        <p className="text-muted small mb-2">
                            {timing === 'rt' ? 'Real time' : 'In-game time'} is
                            always shown.
                        </p>
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="game-show-secondary"
                                checked={showSecondary}
                                onChange={(e) =>
                                    setShowSecondary(e.target.checked)
                                }
                            />
                            <label
                                className="form-check-label"
                                htmlFor="game-show-secondary"
                            >
                                Also show{' '}
                                {timing === 'rt' ? 'game time' : 'real time'}
                            </label>
                        </div>
                        <p className="text-muted small mt-2 mb-0">
                            Applies to every board. Categories with their own
                            display setting keep it. A hidden clock also stops
                            ranking boards by it.
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.section}>
                <h4 className="h6">Emulator policy</h4>
                <div
                    className={styles.segmented}
                    role="radiogroup"
                    aria-label="Emulator policy"
                >
                    <button
                        type="button"
                        role="radio"
                        aria-checked={emulatorPolicy === null}
                        className={
                            emulatorPolicy === null
                                ? styles.segmentActive
                                : undefined
                        }
                        onClick={() => setEmulatorPolicy(null)}
                    >
                        Not specified
                    </button>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={emulatorPolicy === 'allowed'}
                        className={
                            emulatorPolicy === 'allowed'
                                ? styles.segmentActive
                                : undefined
                        }
                        onClick={() => setEmulatorPolicy('allowed')}
                    >
                        Allowed
                    </button>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={emulatorPolicy === 'banned'}
                        className={
                            emulatorPolicy === 'banned'
                                ? styles.segmentActive
                                : undefined
                        }
                        onClick={() => setEmulatorPolicy('banned')}
                    >
                        Banned
                    </button>
                </div>
                <p className="text-muted small mb-0">
                    Shown with the rules on every board.
                </p>
            </div>

            <div className={styles.section}>
                <h4 className="h6">Game rules</h4>
                <p className="text-muted small mb-2">
                    Shown above category rules on every board.
                </p>
                <textarea
                    className="form-control"
                    rows={4}
                    value={gameRules}
                    onChange={(e) => setGameRules(e.target.value)}
                />
            </div>

            <div className={styles.section}>
                <h4 className="h6">Category rules template</h4>
                <p className="text-muted small mb-2">
                    Seeds the rules of every category you feature. Fill in the
                    [brackets].
                </p>
                <textarea
                    className="form-control font-monospace"
                    rows={7}
                    value={rulesTemplate}
                    onChange={(e) => setRulesTemplate(e.target.value)}
                />
            </div>

            {defaultsError && (
                <div className={styles.errorNote}>{defaultsError}</div>
            )}
            {formError && <div className={styles.errorNote}>{formError}</div>}
            <button
                type="submit"
                form="game-details-form"
                className={styles.primaryAction}
                disabled={formBusy || isSavingDefaults}
            >
                {formBusy || isSavingDefaults ? 'Saving…' : 'Save & continue'}
            </button>
        </section>
    );
}
