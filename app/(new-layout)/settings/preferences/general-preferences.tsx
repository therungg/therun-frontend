'use client';

import { useState, useTransition } from 'react';
import {
    FormSection,
    InlineError,
    SwitchField,
} from '~app/(new-layout)/games-v2/[game]/manage/shared/form-kit';
import { toggleStreakVisibility } from '~src/actions/user-preferences.action';

export function GeneralPreferences({ hideStreaks }: { hideStreaks: boolean }) {
    const [hide, setHide] = useState(hideStreaks);
    const [error, setError] = useState<string | null>(null);
    const [pending, start] = useTransition();

    const onChange = (next: boolean) => {
        setHide(next);
        setError(null);
        start(async () => {
            const r = await toggleStreakVisibility(next);
            if (!r.ok) {
                setHide(!next);
                setError(r.error);
            }
        });
    };

    return (
        <FormSection title="Front page">
            <SwitchField
                id="hide-streaks"
                label="Hide streaks"
                hint="Don't show run streaks in your stats on the front page."
                checked={hide}
                disabled={pending}
                onChange={onChange}
            />
            {error && <InlineError>{error}</InlineError>}
        </FormSection>
    );
}
