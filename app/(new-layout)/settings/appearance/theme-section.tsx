'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
    FormSection,
    InlineError,
    SectionFooter,
    SegmentedControl,
    SwitchField,
} from '~app/(new-layout)/games-v2/[game]/manage/shared/form-kit';
import { ThemeEditor } from '~app/(new-layout)/games-v2/[game]/theme/theme-editor';
import {
    getThemeBackgroundUploadUrlAction,
    saveThemeSettingsAction,
} from '~src/actions/theme-settings.action';
import { Button } from '~src/components/Button/Button';
import type { GameTheme } from '~src/lib/game-theme';
import type {
    ProfileThemeSource,
    ThemeSettings,
} from '~src/lib/theme-settings';

const PROFILE_OPTIONS: Array<{ value: ProfileThemeSource; label: string }> = [
    { value: 'own', label: 'Own theme' },
    { value: 'mainGame', label: "Main game's theme" },
    { value: 'none', label: 'None' },
];

export function ThemeSection({ initial }: { initial: ThemeSettings }) {
    const router = useRouter();
    const [settings, setSettings] = useState(initial);
    const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const hasTheme = settings.theme != null;

    const set = (updater: (s: ThemeSettings) => ThemeSettings) => {
        setStatus('idle');
        setSettings(updater);
    };

    const setTheme = (theme: GameTheme | null) => {
        set((s) => ({
            ...s,
            theme,
            profileTheme:
                theme == null && s.profileTheme === 'own'
                    ? 'mainGame'
                    : s.profileTheme,
        }));
    };

    const save = () => {
        setError(null);
        startTransition(async () => {
            const res = await saveThemeSettingsAction(settings);
            if (!res.ok) {
                setStatus('error');
                setError(res.error);
                return;
            }
            setStatus('saved');
            router.refresh();
        });
    };

    return (
        <FormSection title="Theme">
            <ThemeEditor
                value={settings.theme}
                onChange={setTheme}
                busy={pending}
                requestUploadUrl={(file) =>
                    getThemeBackgroundUploadUrlAction({
                        contentType: file.type,
                        contentLength: file.size,
                    })
                }
            />

            <SegmentedControl
                label="Theme on your profile"
                value={settings.profileTheme}
                disabled={pending}
                onChange={(value) =>
                    set((s) => ({
                        ...s,
                        profileTheme: value as ProfileThemeSource,
                    }))
                }
                options={PROFILE_OPTIONS.map((option) => ({
                    ...option,
                    disabled: option.value === 'own' && !hasTheme,
                }))}
            />

            <SwitchField
                id="theme-site-wide"
                label="Use my theme across the site"
                checked={settings.siteWide}
                disabled={pending}
                onChange={(checked) =>
                    set((s) => ({ ...s, siteWide: checked }))
                }
            />
            <SwitchField
                id="theme-over-profiles"
                label="Show my theme over other runners' profiles"
                checked={settings.overProfiles}
                disabled={pending || !settings.siteWide}
                onChange={(checked) =>
                    set((s) => ({ ...s, overProfiles: checked }))
                }
            />
            <SwitchField
                id="theme-over-games"
                label="Show my theme over game boards"
                checked={settings.overGames}
                disabled={pending || !settings.siteWide}
                onChange={(checked) =>
                    set((s) => ({ ...s, overGames: checked }))
                }
            />

            <SectionFooter>
                {hasTheme && (
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => setTheme(null)}
                    >
                        Remove theme
                    </Button>
                )}
                <Button type="button" disabled={pending} onClick={save}>
                    {pending ? 'Saving…' : 'Save theme'}
                </Button>
                {status === 'saved' && <span role="status">Saved.</span>}
                {status === 'error' && error && (
                    <InlineError>{error}</InlineError>
                )}
            </SectionFooter>
        </FormSection>
    );
}
