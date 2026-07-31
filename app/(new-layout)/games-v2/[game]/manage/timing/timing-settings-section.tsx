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
import { loadTimingSettingsAction } from './actions/load-timing-settings.action';
import { updateTimingSettingsAction } from './actions/update-timing-settings.action';

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory | null;
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

const DEFAULT_STORED: StoredFlags = {
    primaryTiming: 'realtime',
    hideRealTime: false,
    hideGameTime: false,
};

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

export function TimingSettingsSection({ gameSlug, gameId, category }: Props) {
    const [state, setState] = useState<State>(stateOf(DEFAULT_STORED));
    const [original, setOriginal] = useState<StoredFlags>(DEFAULT_STORED);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isLoading, startLoad] = useTransition();
    const [isSaving, startSave] = useTransition();

    useEffect(() => {
        if (!category) return;
        setFormError(null);
        startLoad(async () => {
            const res = await loadTimingSettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
            });
            if ('error' in res) {
                setLoadError(res.error);
                setState(stateOf(DEFAULT_STORED));
                setOriginal(DEFAULT_STORED);
                return;
            }
            setLoadError(null);
            const stored: StoredFlags = {
                primaryTiming: res.result.primaryTiming,
                hideRealTime: res.result.hideRealTime,
                hideGameTime: res.result.hideGameTime,
            };
            setState(stateOf(stored));
            setOriginal(stored);
        });
    }, [category, gameSlug, gameId]);

    if (!category) return null;

    const desired = hidePairOf(state);
    const dirty =
        state.primaryTiming !== original.primaryTiming ||
        desired.hideRealTime !== original.hideRealTime ||
        desired.hideGameTime !== original.hideGameTime;
    const busy = isLoading || isSaving;

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
                    Defaults for <strong>{category.display}</strong>. Applies to
                    how runs are displayed and which timing method is used to
                    rank the leaderboard.
                </>
            }
        >
            <InlineError>{loadError}</InlineError>
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
