'use client';

import { useState, useTransition } from 'react';
import {
    FormSection,
    InlineError,
    SwitchField,
} from '~app/(new-layout)/games/[game]/manage/shared/form-kit';
import {
    toggleAutoSubmitPbs,
    toggleOpenData,
    toggleStreakVisibility,
} from '~src/actions/user-preferences.action';
import type { ActionResult } from '~src/lib/action-result';

function usePreferenceSwitch(
    initial: boolean,
    save: (next: boolean) => Promise<ActionResult>,
) {
    const [checked, setChecked] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const [pending, start] = useTransition();

    const onChange = (next: boolean) => {
        setChecked(next);
        setError(null);
        start(async () => {
            const r = await save(next);
            if (!r.ok) {
                setChecked(!next);
                setError(r.error);
            }
        });
    };

    return { checked, error, pending, onChange };
}

export function GeneralPreferences({
    hideStreaks,
    autoSubmitPbs,
    openData,
}: {
    hideStreaks: boolean;
    autoSubmitPbs: boolean;
    openData: boolean;
}) {
    const streaks = usePreferenceSwitch(hideStreaks, toggleStreakVisibility);
    const submit = usePreferenceSwitch(autoSubmitPbs, toggleAutoSubmitPbs);
    const open = usePreferenceSwitch(openData, toggleOpenData);

    return (
        <>
            <FormSection title="Front page">
                <SwitchField
                    id="hide-streaks"
                    label="Hide streaks"
                    hint="Don't show run streaks in your stats on the front page."
                    checked={streaks.checked}
                    disabled={streaks.pending}
                    onChange={streaks.onChange}
                />
                {streaks.error && <InlineError>{streaks.error}</InlineError>}
            </FormSection>
            <FormSection title="Leaderboards">
                <SwitchField
                    id="auto-submit-pbs"
                    label="Automatically submit PBs to the leaderboard's mod queue if the game allows it"
                    hint="When off, you can submit your runs from LiveSplit by going to your profile. When on, they will be auto-submitted to the game's mod queue if that game's settings allow that."
                    checked={submit.checked}
                    disabled={submit.pending}
                    onChange={submit.onChange}
                />
                {submit.error && <InlineError>{submit.error}</InlineError>}
            </FormSection>
            <FormSection title="Exports">
                <SwitchField
                    id="export-name"
                    label="Show my name in exports"
                    hint="Anyone can export a leaderboard with the Export button. Turn this off and your runs are in exports as Anonymous, without video links. Your name stays on the site."
                    checked={open.checked}
                    disabled={open.pending}
                    onChange={open.onChange}
                />
                {open.error && <InlineError>{open.error}</InlineError>}
            </FormSection>
        </>
    );
}
