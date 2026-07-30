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

interface State {
    primaryTiming: PrimaryTiming;
    hideRealTime: boolean;
    hideGameTime: boolean;
}

const DEFAULT_STATE: State = {
    primaryTiming: 'realtime',
    hideRealTime: false,
    hideGameTime: false,
};

export function TimingSettingsSection({ gameSlug, gameId, category }: Props) {
    const [state, setState] = useState<State>(DEFAULT_STATE);
    const [original, setOriginal] = useState<State>(DEFAULT_STATE);
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
                setState(DEFAULT_STATE);
                setOriginal(DEFAULT_STATE);
                return;
            }
            setLoadError(null);
            const next: State = {
                primaryTiming: res.result.primaryTiming,
                hideRealTime: res.result.hideRealTime,
                hideGameTime: res.result.hideGameTime,
            };
            setState(next);
            setOriginal(next);
        });
    }, [category, gameSlug, gameId]);

    if (!category) return null;

    const dirty =
        state.primaryTiming !== original.primaryTiming ||
        state.hideRealTime !== original.hideRealTime ||
        state.hideGameTime !== original.hideGameTime;
    const busy = isLoading || isSaving;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (state.hideRealTime && state.hideGameTime) {
            setFormError('Cannot hide both real time and game time.');
            return;
        }

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
                    state.hideRealTime !== original.hideRealTime
                        ? state.hideRealTime
                        : undefined,
                hideGameTime:
                    state.hideGameTime !== original.hideGameTime
                        ? state.hideGameTime
                        : undefined,
            });
            if ('error' in res) {
                setFormError(res.error);
                return;
            }
            toast.success('Timing settings saved');
            setOriginal(state);
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
                    id="hideRT"
                    label="Hide real time"
                    checked={state.hideRealTime}
                    disabled={busy}
                    onChange={(checked) =>
                        setState((s) => ({
                            ...s,
                            hideRealTime: checked,
                            hideGameTime: checked ? false : s.hideGameTime,
                        }))
                    }
                />
                <SwitchField
                    id="hideGT"
                    label="Hide game time"
                    checked={state.hideGameTime}
                    disabled={busy}
                    onChange={(checked) =>
                        setState((s) => ({
                            ...s,
                            hideGameTime: checked,
                            hideRealTime: checked ? false : s.hideRealTime,
                        }))
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
                </SectionFooter>
            </form>
        </FormSection>
    );
}
