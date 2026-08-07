'use client';

import { FormEvent, useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import {
    FormSection,
    InlineError,
    SectionFooter,
    SegmentedControl,
    SwitchField,
} from '../shared/form-kit';
import kit from '../shared/form-kit.module.scss';
import { updateTimingSettingsAction } from './actions/update-timing-settings.action';

/** The game's board-wide timing defaults (step 1 of the wizard), for the
 * "matches the game default?" caption. Optional — mounts that can't supply
 * it just don't get the caption. */
export interface GameTimingDefaults {
    primaryTiming: 'rt' | 'gt' | null;
    /** What the game default calls the game-time clock; null = unset (IGT). */
    gameTimeLabel: 'igt' | 'lrt' | null;
    hideRealTime: boolean;
    hideGameTime: boolean;
}

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory | null;
    gameDefaults?: GameTimingDefaults;
}

// The primary clock is always shown — the form only asks whether the
// secondary shows next to it. The hide pair is derived at save time
// (primary always false), so the server's both-hidden guard can't trip.
interface State {
    primaryTiming: PrimaryTiming;
    /** What this board calls its game-time clock. Display only — 'lrt'
     * behaves exactly like 'igt'. */
    gameTimeLabel: 'igt' | 'lrt';
    showSecondary: boolean;
    rtaFallback: boolean;
}

/** Server truth, kept verbatim so saves can send only the fields that
 * actually changed — the update action treats undefined as untouched. */
interface StoredFlags {
    primaryTiming: PrimaryTiming;
    gameTimeLabel: 'igt' | 'lrt';
    hideRealTime: boolean;
    hideGameTime: boolean;
    rtaFallback: boolean;
}

/** The option only makes sense where the board carries IGT at all — as the
 * primary clock, or shown as the secondary. */
function hasIgt(state: State): boolean {
    return state.primaryTiming === 'gametime' || state.showSecondary;
}

/**
 * Seeded from the category row the editor already holds — the live Postgres
 * read (`resolveCategory`), not a second fetch. The old load action went
 * through pageData, which rebuilds asynchronously after writes: right after
 * the wizard featured-and-seeded a category it served the *pre-seed* values,
 * which is exactly the "my game settings didn't transfer" report.
 */
function storedOf(category: ResolvedCategory): StoredFlags {
    return {
        primaryTiming:
            category.primaryTiming === 'gt' ? 'gametime' : 'realtime',
        gameTimeLabel: category.gameTimeLabel === 'lrt' ? 'lrt' : 'igt',
        hideRealTime: category.hideRealTime ?? false,
        hideGameTime: category.hideGameTime ?? false,
        rtaFallback: category.rtaFallback ?? false,
    };
}

function stateOf(stored: StoredFlags): State {
    return {
        primaryTiming: stored.primaryTiming,
        gameTimeLabel: stored.gameTimeLabel,
        showSecondary:
            stored.primaryTiming === 'realtime'
                ? !stored.hideGameTime
                : !stored.hideRealTime,
        rtaFallback: stored.rtaFallback,
    };
}

function hidePairOf(state: State): {
    hideRealTime: boolean;
    hideGameTime: boolean;
} {
    return {
        hideRealTime:
            state.primaryTiming === 'realtime' ? false : !state.showSecondary,
        hideGameTime:
            state.primaryTiming === 'gametime' ? false : !state.showSecondary,
    };
}

function defaultsState(defaults: GameTimingDefaults): State {
    // Game defaults don't carry rtaFallback — it stays a per-category call.
    return stateOf({
        primaryTiming:
            defaults.primaryTiming === 'gt' ? 'gametime' : 'realtime',
        gameTimeLabel: defaults.gameTimeLabel === 'lrt' ? 'lrt' : 'igt',
        hideRealTime: defaults.hideRealTime,
        hideGameTime: defaults.hideGameTime,
        rtaFallback: false,
    });
}

function describeState(state: State): string {
    const primary =
        state.primaryTiming === 'gametime'
            ? state.gameTimeLabel === 'lrt'
                ? 'Load-removed time'
                : 'Game time'
            : 'Real time';
    return state.showSecondary
        ? `${primary} · both clocks shown`
        : `${primary} only`;
}

export function TimingSettingsSection({
    gameSlug,
    gameId,
    category,
    gameDefaults,
}: Props) {
    const fallback: StoredFlags = {
        primaryTiming: 'realtime',
        gameTimeLabel: 'igt',
        hideRealTime: false,
        hideGameTime: false,
        rtaFallback: false,
    };
    const [state, setState] = useState<State>(() =>
        stateOf(category ? storedOf(category) : fallback),
    );
    const [original, setOriginal] = useState<StoredFlags>(() =>
        category ? storedOf(category) : fallback,
    );
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, startSave] = useTransition();

    // Re-seed when the mount switches category (console prev/next walk) or a
    // router.refresh() lands fresher values.
    useEffect(() => {
        if (!category) return;
        const stored = storedOf(category);
        setState(stateOf(stored));
        setOriginal(stored);
        setFormError(null);
    }, [
        category?.id,
        category?.primaryTiming,
        category?.gameTimeLabel,
        category?.hideRealTime,
        category?.hideGameTime,
        category?.rtaFallback,
    ]);

    if (!category) return null;

    const desired = hidePairOf(state);
    // The switch only applies while the board carries IGT; leaving it behind
    // (e.g. flipping to RT-only) silently clears it rather than persisting a
    // setting the board can no longer act on.
    const desiredRtaFallback = hasIgt(state) ? state.rtaFallback : false;
    const dirty =
        state.primaryTiming !== original.primaryTiming ||
        state.gameTimeLabel !== original.gameTimeLabel ||
        desired.hideRealTime !== original.hideRealTime ||
        desired.hideGameTime !== original.hideGameTime ||
        desiredRtaFallback !== original.rtaFallback;
    const busy = isSaving;

    const gameDefault = gameDefaults ? defaultsState(gameDefaults) : null;
    const matchesDefault =
        gameDefault != null &&
        gameDefault.primaryTiming === state.primaryTiming &&
        (state.primaryTiming === 'realtime' ||
            gameDefault.gameTimeLabel === state.gameTimeLabel) &&
        gameDefault.showSecondary === state.showSecondary;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);

        startSave(async () => {
            const res = await updateTimingSettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                primaryTiming:
                    state.primaryTiming !== original.primaryTiming
                        ? state.primaryTiming
                        : undefined,
                gameTimeLabel:
                    state.gameTimeLabel !== original.gameTimeLabel
                        ? state.gameTimeLabel
                        : undefined,
                hideRealTime:
                    desired.hideRealTime !== original.hideRealTime
                        ? desired.hideRealTime
                        : undefined,
                hideGameTime:
                    desired.hideGameTime !== original.hideGameTime
                        ? desired.hideGameTime
                        : undefined,
                rtaFallback:
                    desiredRtaFallback !== original.rtaFallback
                        ? desiredRtaFallback
                        : undefined,
            });
            if ('error' in res) {
                setFormError(res.error);
                return;
            }
            toast.success('Timing settings saved');
            setOriginal({
                primaryTiming: state.primaryTiming,
                gameTimeLabel: state.gameTimeLabel,
                ...desired,
                rtaFallback: desiredRtaFallback,
            });
        });
    };

    return (
        <FormSection
            title="Timing"
            lede={
                <>
                    How <strong>{category.display}</strong> is timed: which
                    clock ranks the board, and whether the other one shows next
                    to it.
                </>
            }
        >
            <form onSubmit={handleSubmit}>
                <SegmentedControl
                    label="Primary timing"
                    value={
                        state.primaryTiming === 'realtime'
                            ? 'realtime'
                            : state.gameTimeLabel === 'lrt'
                              ? 'lrt'
                              : 'gametime'
                    }
                    options={[
                        { value: 'realtime', label: 'Real time' },
                        { value: 'gametime', label: 'IGT' },
                        { value: 'lrt', label: 'LRT' },
                    ]}
                    disabled={busy}
                    onChange={(v) =>
                        // LRT is IGT under another name: primaryTiming stays
                        // 'gametime', only the display label changes.
                        setState((s) => ({
                            ...s,
                            primaryTiming:
                                v === 'realtime' ? 'realtime' : 'gametime',
                            gameTimeLabel: v === 'lrt' ? 'lrt' : 'igt',
                        }))
                    }
                />
                <SwitchField
                    id="showSecondary"
                    label={
                        state.primaryTiming === 'realtime'
                            ? state.gameTimeLabel === 'lrt'
                                ? 'Also show load-removed time'
                                : 'Also show game time'
                            : 'Also show real time'
                    }
                    checked={state.showSecondary}
                    disabled={busy}
                    onChange={(checked) =>
                        setState((s) => ({ ...s, showSecondary: checked }))
                    }
                />
                {hasIgt(state) && (
                    <>
                        <SwitchField
                            id="rtaFallback"
                            label={`Put RTA in leaderboard if ${state.gameTimeLabel === 'lrt' ? 'LRT' : 'IGT'} is not available`}
                            checked={state.rtaFallback}
                            disabled={busy}
                            onChange={(checked) =>
                                setState((s) => ({
                                    ...s,
                                    rtaFallback: checked,
                                }))
                            }
                        />
                        {state.rtaFallback && (
                            <p className="text-muted small mb-0 mt-1">
                                Runs without game time rank by their real time
                                on the game-time board, marked as RTA.
                            </p>
                        )}
                    </>
                )}
                {gameDefault && (
                    <p className="text-muted small mb-0 mt-1">
                        Game default: {describeState(gameDefault)}
                        {matchesDefault ? (
                            ' — this category matches.'
                        ) : (
                            <>
                                {' · '}
                                <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0 align-baseline"
                                    disabled={busy}
                                    onClick={() =>
                                        // Clock fields only — rtaFallback has
                                        // no game-level default to restore.
                                        setState((s) => ({
                                            ...gameDefault,
                                            rtaFallback: s.rtaFallback,
                                        }))
                                    }
                                >
                                    Use game default
                                </button>
                            </>
                        )}
                    </p>
                )}
                <InlineError>{formError}</InlineError>
                <SectionFooter>
                    <button
                        type="submit"
                        className={kit.saveBtn}
                        disabled={busy || !dirty}
                    >
                        {isSaving ? 'Saving…' : 'Save timing'}
                    </button>
                    <button
                        type="button"
                        className={kit.resetBtn}
                        onClick={() => {
                            setState(stateOf(original));
                            setFormError(null);
                        }}
                        disabled={busy || !dirty}
                    >
                        Reset
                    </button>
                </SectionFooter>
            </form>
        </FormSection>
    );
}
