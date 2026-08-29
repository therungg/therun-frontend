'use client';

import { useRef, useState, useTransition } from 'react';
import {
    type TimingChoice,
    timingChoiceOf,
} from '~src/lib/setup/board-defaults';
import { updateGameMetadataAction } from '../actions/update-game-metadata.action';
import { GameDetailsForm } from '../game-details-form';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

export function StepDetails({ data, onAdvance }: StepProps) {
    // Game-level primary timing lives on the game-metadata read path, not
    // `data.game.primaryTiming` — `resolveGame()` never populates that field
    // (it only fetches identity fields from `/v1/games/by-slug`), so it is
    // always undefined. `data.metadata` is the real source of truth here.
    // 'lrt' is IGT under another name: it saves as gt + gameTimeLabel 'lrt'
    // and behaves identically everywhere.
    const [timing, setTiming] = useState<TimingChoice>(
        timingChoiceOf(
            data.metadata.primaryTiming ?? 'rt',
            data.metadata.gameTimeLabel ?? 'igt',
        ),
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
        const initial = data.metadata.primaryTiming ?? 'rt';
        return initial === 'rt'
            ? !(data.metadata.hideGameTime ?? false)
            : !(data.metadata.hideRealTime ?? false);
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

    const handleDetailsSaved = () => {
        if (isSavingDefaultsRef.current) return;

        setDefaultsError(null);

        isSavingDefaultsRef.current = true;
        startSavingDefaults(async () => {
            try {
                const metaRes = await updateGameMetadataAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    primaryTiming: timing === 'rt' ? 'rt' : 'gt',
                    // RTA leaves the stored label alone (see
                    // timingChoiceFields) — undefined is "untouched" to the
                    // action, so a board flipped to RTA keeps calling its
                    // game-time clock LRT.
                    gameTimeLabel:
                        timing === 'rt'
                            ? undefined
                            : timing === 'lrt'
                              ? 'lrt'
                              : 'igt',
                    gameRules: gameRules.trim() || null,
                    emulatorPolicy,
                    hideRealTime: timing === 'rt' ? false : !showSecondary,
                    hideGameTime: timing === 'rt' ? !showSecondary : false,
                });
                if ('error' in metaRes) {
                    setDefaultsError(metaRes.error);
                    return;
                }

                onAdvance();
            } finally {
                isSavingDefaultsRef.current = false;
            }
        });
    };

    return (
        <section className={styles.detailsColumn}>
            <StepHeader step="details" title="Game details" />

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
                    sectioned
                    canRematch={data.canRematch}
                    onBusyChange={setFormBusy}
                    onErrorChange={setFormError}
                    onSaved={handleDetailsSaved}
                />
            </div>

            <div className={styles.section}>
                <div className={styles.settingsGrid}>
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
                                onClick={() => setTiming('rt')}
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
                                onClick={() => setTiming('gt')}
                            >
                                IGT
                            </button>
                            <button
                                type="button"
                                role="radio"
                                aria-checked={timing === 'lrt'}
                                className={
                                    timing === 'lrt'
                                        ? styles.segmentActive
                                        : undefined
                                }
                                onClick={() => setTiming('lrt')}
                            >
                                LRT
                            </button>
                        </div>
                    </div>
                    <div>
                        <h4 className="h6">Time columns</h4>
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
                    </div>
                    <div>
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
                    </div>
                </div>
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

            {defaultsError && (
                <div className={styles.errorNote}>{defaultsError}</div>
            )}
            {formError && <div className={styles.errorNote}>{formError}</div>}
            <div className={styles.detailsFooter}>
                <button
                    type="submit"
                    form="game-details-form"
                    className={styles.primaryAction}
                    disabled={formBusy || isSavingDefaults}
                >
                    {formBusy || isSavingDefaults
                        ? 'Saving…'
                        : 'Save & continue'}
                </button>
            </div>
        </section>
    );
}
