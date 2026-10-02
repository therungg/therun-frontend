'use client';

import { useState, useTransition } from 'react';
import {
    FormSection,
    InlineError,
    SwitchField,
} from '~app/(new-layout)/games/[game]/manage/shared/form-kit';
import {
    toggleAutoSubmitPbs,
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
}: {
    hideStreaks: boolean;
    autoSubmitPbs: boolean;
}) {
    const streaks = usePreferenceSwitch(hideStreaks, toggleStreakVisibility);
    const submit = usePreferenceSwitch(autoSubmitPbs, toggleAutoSubmitPbs);

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
                    hint="When off, new PBs from your timer wait on your Submissions page until you submit them."
                    checked={submit.checked}
                    disabled={submit.pending}
                    onChange={submit.onChange}
                />
                {submit.error && <InlineError>{submit.error}</InlineError>}
            </FormSection>
        </>
    );
}
