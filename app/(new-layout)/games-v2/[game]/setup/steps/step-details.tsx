'use client';

import { useState, useTransition } from 'react';
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

    // Game-wide minimum time = the categoryId-null min_time policy (mirrors
    // step-defaults.tsx). The bound key follows `timing`, never both.
    const gameMinPolicy = findGameMinPolicy(data.policies);
    const [minPolicyId, setMinPolicyId] = useState<number | null>(
        gameMinPolicy?.id ?? null,
    );
    const [minText, setMinText] = useState(() => {
        const ms = minMsFromPolicy(gameMinPolicy, timing);
        return ms ? formatTimeInput(ms) : '';
    });

    const [defaultsError, setDefaultsError] = useState<string | null>(null);
    const [isSavingDefaults, startSavingDefaults] = useTransition();

    // Switching timing relabels the field and re-reads the value bound to
    // that timing — a value typed for one binding never leaks into the other.
    const selectTiming = (next: Timing) => {
        setTiming(next);
        const ms = minMsFromPolicy(gameMinPolicy, next);
        setMinText(ms ? formatTimeInput(ms) : '');
    };

    const handleDetailsSaved = () => {
        setDefaultsError(null);

        const minMsValue = minText.trim() ? parseTimeInput(minText) : undefined;
        if (minText.trim() && (!minMsValue || minMsValue <= 0)) {
            setDefaultsError('Enter the minimum time as h:mm:ss or m:ss.');
            return;
        }

        startSavingDefaults(async () => {
            const metaRes = await updateGameMetadataAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                primaryTiming: timing,
                rulesTemplate: rulesTemplate.trim() || null,
                gameRules: gameRules.trim() || null,
                emulatorPolicy,
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
        });
    };

    return (
        <section>
            <StepHeader
                step="details"
                title="Game details"
                lede={
                    data.categories.length > 0
                        ? 'Runners are already on this board. The details below are pre-filled from IGDB, so fix anything that’s wrong and move on. Everything saves as you go.'
                        : 'This board has no runs yet. The details below are pre-filled from IGDB, so fix anything that’s wrong and move on. Everything saves as you go.'
                }
            />
            <GameDetailsForm
                identifiers={data.identifiers}
                metadata={data.metadata}
                game={{
                    id: data.game.id,
                    name: data.game.name,
                    image: data.game.image ?? null,
                }}
                onSaved={handleDetailsSaved}
            />

            <div className={styles.section}>
                <h3 className="h6">Timing</h3>
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
                            timing === 'rt' ? styles.segmentActive : undefined
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
                            timing === 'gt' ? styles.segmentActive : undefined
                        }
                        onClick={() => selectTiming('gt')}
                    >
                        IGT
                    </button>
                </div>
                <p className="text-muted small mb-0">
                    The default timing method for this board’s categories.
                </p>
            </div>

            <div className={styles.section}>
                <h3 className="h6">Category rules template</h3>
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

            <div className={styles.section}>
                <h3 className="h6">Game rules</h3>
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
                <h3 className="h6">Emulator policy</h3>
                <div className="form-check">
                    <input
                        type="radio"
                        className="form-check-input"
                        id="board-emulator-unset"
                        name="board-emulator-policy"
                        checked={emulatorPolicy === null}
                        onChange={() => setEmulatorPolicy(null)}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="board-emulator-unset"
                    >
                        Not specified
                    </label>
                </div>
                <div className="form-check">
                    <input
                        type="radio"
                        className="form-check-input"
                        id="board-emulator-allowed"
                        name="board-emulator-policy"
                        checked={emulatorPolicy === 'allowed'}
                        onChange={() => setEmulatorPolicy('allowed')}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="board-emulator-allowed"
                    >
                        Allowed
                    </label>
                </div>
                <div className="form-check">
                    <input
                        type="radio"
                        className="form-check-input"
                        id="board-emulator-banned"
                        name="board-emulator-policy"
                        checked={emulatorPolicy === 'banned'}
                        onChange={() => setEmulatorPolicy('banned')}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="board-emulator-banned"
                    >
                        Banned
                    </label>
                </div>
            </div>

            <div className={styles.section}>
                <h3 className="h6">Minimum time</h3>
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
                    Runs under this minimum wait for a mod. Clear the field to
                    remove the limit.
                </p>
            </div>

            {defaultsError && (
                <div className={styles.errorNote}>{defaultsError}</div>
            )}
            {isSavingDefaults && (
                <p className="text-muted small">Saving board defaults…</p>
            )}
        </section>
    );
}
