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
    showSecondary: boolean;
}

/** Server truth, kept verbatim so saves can send only the fields that
 * actually changed — the update action treats undefined as untouched. */
interface StoredFlags {
    primaryTiming: PrimaryTiming;
    hideRealTime: boolean;
    hideGameTime: boolean;
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
        hideRealTime: category.hideRealTime ?? false,
        hideGameTime: category.hideGameTime ?? false,
    };
}

function stateOf(stored: StoredFlags): State {
    return {
        primaryTiming: stored.primaryTiming,
        showSecondary:
            stored.primaryTiming === 'realtime'
                ? !stored.hideGameTime
                : !stored.hideRealTime,
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
    return stateOf({
        primaryTiming:
            defaults.primaryTiming === 'gt' ? 'gametime' : 'realtime',
        hideRealTime: defaults.hideRealTime,
        hideGameTime: defaults.hideGameTime,
    });
}

function describeState(state: State): string {
    const primary =
        state.primaryTiming === 'gametime' ? 'Game time' : 'Real time';
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
        hideRealTime: false,
        hideGameTime: false,
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
        category?.hideRealTime,
        category?.hideGameTime,
    ]);

    if (!category) return null;

    const desired = hidePairOf(state);
    const dirty =
        state.primaryTiming !== original.primaryTiming ||
        desired.hideRealTime !== original.hideRealTime ||
        desired.hideGameTime !== original.hideGameTime;
    const busy = isSaving;

    const gameDefault = gameDefaults ? defaultsState(gameDefaults) : null;
    const matchesDefault =
        gameDefault != null &&
        gameDefault.primaryTiming === state.primaryTiming &&
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
                hideRealTime:
                    desired.hideRealTime !== original.hideRealTime
                        ? desired.hideRealTime
                        : undefined,
                hideGameTime:
                    desired.hideGameTime !== original.hideGameTime
                        ? desired.hideGameTime
                        : undefined,
            });
            if ('error' in res) {
                setFormError(res.error);
                return;
            }
            toast.success('Timing settings saved');
            setOriginal({ primaryTiming: state.primaryTiming, ...desired });
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
                    value={state.primaryTiming}
                    options={[
                        { value: 'realtime', label: 'Real time' },
                        { value: 'gametime', label: 'Game time' },
                    ]}
                    disabled={busy}
                    onChange={(v) =>
                        setState((s) => ({
                            ...s,
                            primaryTiming: v as PrimaryTiming,
                        }))
                    }
                />
                <SwitchField
                    id="showSecondary"
                    label={
                        state.primaryTiming === 'realtime'
                            ? 'Also show game time'
                            : 'Also show real time'
                    }
                    checked={state.showSecondary}
                    disabled={busy}
                    onChange={(checked) =>
                        setState((s) => ({ ...s, showSecondary: checked }))
                    }
                />
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
                                    onClick={() => setState(gameDefault)}
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
