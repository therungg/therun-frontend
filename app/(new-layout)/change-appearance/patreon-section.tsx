'use client';

import axios from 'axios';
import Router from 'next/router';
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { legacyPresetMap } from '~src/components/patreon/legacy-preset-map';
import type { PatronPreferences, PerMode } from '../../../types/patreon.types';
import type { User } from '../../../types/session.types';
import { ContrastWarning } from './customization/contrast-warning';
import styles from './customization/customization.module.scss';
import { DisplaySection } from './customization/display-section';
import { EffectsSection } from './customization/effects-section';
import { FillSection } from './customization/fill-section';
import { FontSection } from './customization/font-section';
import { PresetShortcuts } from './customization/preset-shortcuts';
import { PreviewPane } from './customization/preview-pane';
import { validatePrefs } from './customization/validation';
import { LoginWithPatreon } from './login-with-patreon';

export interface UserPatreonData {
    tier: 1 | 2 | 3;
    preferences: PatronPreferences;
}

interface PatreonSectionProps {
    userPatreonData: UserPatreonData;
    session: User;
}

const EMPTY_PREFERENCES: PatronPreferences = {
    hide: false,
    featureInScrollbar: true,
    featureOnOverview: true,
    showIcon: true,
    customColor: null,
    customGradient: null,
    bold: false,
    italic: false,
    textShadow: null,
    outline: null,
    gradientAngle: null,
    gradientAnimated: false,
};

export default function PatreonSection({
    userPatreonData,
    session,
    baseUrl,
}: PatreonSectionProps & { baseUrl: string }) {
    if (!userPatreonData.tier) {
        return <LoginWithPatreon session={session} baseUrl={baseUrl} />;
    }
    return (
        <PatreonSettings session={session} userPatreonData={userPatreonData} />
    );
}

function PatreonSettings({ userPatreonData, session }: PatreonSectionProps) {
    const hadLegacy =
        !!userPatreonData.preferences.colorPreference &&
        !userPatreonData.preferences.customColor &&
        !userPatreonData.preferences.customGradient;
    const legacy = hadLegacy
        ? legacyPresetMap(userPatreonData.preferences.colorPreference)
        : null;
    const initial: PatronPreferences = {
        ...EMPTY_PREFERENCES,
        ...userPatreonData.preferences,
        customColor:
            legacy?.kind === 'solid'
                ? legacy.value
                : (userPatreonData.preferences.customColor ?? null),
        customGradient:
            legacy?.kind === 'gradient'
                ? legacy.value
                : (userPatreonData.preferences.customGradient ?? null),
    };
    const [prefs, setPrefs] = useState<PatronPreferences>(initial);
    const [saving, setSaving] = useState(false);
    const [legacyBannerDismissed, setLegacyBannerDismissed] = useState(false);
    const validation = validatePrefs(prefs);

    const update = <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => {
        setPrefs((p) => ({ ...p, [key]: value }));
    };

    const resetAll = () => {
        setPrefs({
            ...EMPTY_PREFERENCES,
            // keep display preferences as-is
            hide: prefs.hide,
            featureInScrollbar: prefs.featureInScrollbar,
            featureOnOverview: prefs.featureOnOverview,
            showIcon: prefs.showIcon,
            colorPreference: 0,
        });
    };

    const onSave = async () => {
        setSaving(true);
        try {
            const payload: PatronPreferences = {
                ...prefs,
                // Clear legacy after any save from the new UI.
                colorPreference: 0,
            };
            await axios.post(
                `/api/users/${session.id}-${session.username}/patreon-settings`,
                payload,
            );
            Router.reload();
        } finally {
            setSaving(false);
        }
    };

    // PerMode helper used by later tasks' subcomponents.
    void ({} as PerMode<string>);

    return (
        <div>
            <h1>Patreon Customization</h1>
            <p>Thank you for supporting! Customize how your name appears.</p>
            {hadLegacy && !legacyBannerDismissed && (
                <div className={styles.migrationBanner}>
                    <span>
                        We've imported your current color. Save to switch to the
                        new customizer.
                    </span>
                    <button
                        type="button"
                        className={styles.chip}
                        onClick={() => setLegacyBannerDismissed(true)}
                    >
                        ✕
                    </button>
                </div>
            )}
            <div className={styles.layout}>
                <div className={styles.left}>
                    <PresetShortcuts
                        tier={userPatreonData.tier}
                        username={session.username}
                        onChange={update}
                    />
                    {userPatreonData.tier >= 2 && (
                        <FillSection
                            prefs={prefs}
                            tier={userPatreonData.tier}
                            onChange={update}
                        />
                    )}
                    {userPatreonData.tier >= 2 && (
                        <FontSection prefs={prefs} onChange={update} />
                    )}
                    {userPatreonData.tier >= 3 && (
                        <EffectsSection prefs={prefs} onChange={update} />
                    )}
                    <DisplaySection
                        prefs={prefs}
                        tier={userPatreonData.tier}
                        onChange={update}
                    />
                </div>
                <div className={styles.right}>
                    <PreviewPane
                        username={session.username}
                        preferences={prefs}
                        tier={userPatreonData.tier}
                    />
                    <ContrastWarning
                        prefs={prefs}
                        tier={userPatreonData.tier}
                    />
                    {!validation.ok && (
                        <div className={styles.errorText}>
                            {validation.errors.map((e, i) => (
                                <div key={i}>{e}</div>
                            ))}
                        </div>
                    )}
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={resetAll}
                    >
                        Reset to default
                    </Button>
                    <Button
                        variant="primary"
                        onClick={onSave}
                        disabled={saving || !validation.ok}
                    >
                        {saving ? 'Saving…' : 'Save settings'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
