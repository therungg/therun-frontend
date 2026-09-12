'use client';

import { useRef, useState, useTransition } from 'react';
import { splitLevelBoards } from '~src/lib/levels/display';
import {
    otherTimeField,
    type TimingChoice,
    timingChoiceOf,
} from '~src/lib/setup/board-defaults';
import { bulkUpdateCategoriesAction } from '../actions/bulk-update-categories.action';
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
    // Seeded from the categories this control writes to, not from the game
    // row, which no longer governs anything. Mixed boards seed as "shown" —
    // the switch states an intent to apply, not an existing uniform value.
    const [showSecondary, setShowSecondary] = useState(() => {
        const targets = splitLevelBoards(
            data.categories,
            data.groups,
        ).fullGame.filter((c) => !c.archived);
        if (targets.length === 0) return true;
        return targets.some((c) =>
            c.primaryTiming === 'gt'
                ? !(c.hideRealTime ?? false)
                : !(c.hideGameTime ?? false),
        );
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
                });
                if ('error' in metaRes) {
                    setDefaultsError(metaRes.error);
                    return;
                }

                // Timing visibility is stamped, not inherited: this control
                // is a one-time bulk set across the board's full-game
                // categories. Level boards are the Levels step's business —
                // they follow their template, not this switch.
                const targets = splitLevelBoards(
                    data.categories,
                    data.groups,
                ).fullGame.filter((c) => !c.archived);

                // Which flag expresses "show the other clock" depends on what
                // each category ranks by, so the write is grouped by the
                // category's own primary timing rather than sent as one field.
                for (const primary of ['rt', 'gt'] as const) {
                    const ids = targets
                        .filter((c) => c.primaryTiming === primary)
                        .map((c) => c.id);
                    // The backend caps a bulk call at BULK_CATEGORY_LIMIT (200).
                    for (let i = 0; i < ids.length; i += 200) {
                        const chunk = ids.slice(i, i + 200);
                        if (chunk.length === 0) continue;
                        const res = await bulkUpdateCategoriesAction({
                            gameSlug: data.game.name,
                            gameId: data.game.id,
                            categoryIds: chunk,
                            fields: otherTimeField(primary, showSecondary),
                        });
                        if ('error' in res) {
                            setDefaultsError(res.error);
                            return;
                        }
                    }
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
                        <p className="text-muted small mb-2">
                            Applies to every category on this board. Individual
                            categories can be changed afterwards.
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
