'use client';

import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { mutate } from 'swr';
import { legacyPresetMap } from '~src/components/patreon/legacy-preset-map';
import type { PatronPreferences, PerMode } from '../../../types/patreon.types';
import type { User } from '../../../types/session.types';
import { ContrastWarning } from './customization/contrast-warning';
import styles from './customization/customization.module.scss';
import { DisplaySection } from './customization/display-section';
import { FillSection } from './customization/fill-section';
import { FontSection } from './customization/font-section';
import { PreviewPane } from './customization/preview-pane';
import { TierOverview } from './customization/tier-overview';
import { validatePrefs } from './customization/validation';
import { LoginWithPatreon } from './login-with-patreon';

export interface UserPatreonData {
    tier: 1 | 2 | 3;
    preferences: PatronPreferences | null;
}

interface PatreonSectionProps {
    userPatreonData: UserPatreonData;
    session: User;
    tierOverride?: 1 | 2 | 3;
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
    gradientAngle: null,
    gradientAnimated: false,
};

export default function PatreonSection({
    userPatreonData,
    session,
    baseUrl,
    tierOverride,
}: PatreonSectionProps & { baseUrl: string }) {
    const isAdmin = session.roles?.includes('admin') ?? false;
    if (!userPatreonData.tier && !isAdmin) {
        return <LoginWithPatreon session={session} baseUrl={baseUrl} />;
    }
    return (
        <PatreonSettings
            session={session}
            userPatreonData={userPatreonData}
            tierOverride={tierOverride}
        />
    );
}

function PatreonSettings({
    userPatreonData,
    session,
    tierOverride,
}: PatreonSectionProps) {
    const isAdmin = session.roles?.includes('admin') ?? false;
    const effectiveTier: 1 | 2 | 3 =
        tierOverride != null
            ? tierOverride
            : isAdmin
              ? 3
              : (userPatreonData.tier ?? 1);
    const savedPrefs = userPatreonData.preferences ?? EMPTY_PREFERENCES;
    const hadLegacy =
        !!savedPrefs.colorPreference &&
        !savedPrefs.customColor &&
        !savedPrefs.customGradient;
    const legacy = hadLegacy
        ? legacyPresetMap(savedPrefs.colorPreference)
        : null;
    const initial: PatronPreferences = {
        ...EMPTY_PREFERENCES,
        ...savedPrefs,
        customColor:
            legacy?.kind === 'solid'
                ? legacy.value
                : (savedPrefs.customColor ?? null),
        customGradient:
            legacy?.kind === 'gradient'
                ? legacy.value
                : (savedPrefs.customGradient ?? null),
    };
    const [prefs, setPrefs] = useState<PatronPreferences>(initial);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [legacyBannerDismissed, setLegacyBannerDismissed] = useState(false);
    const router = useRouter();
    const [mode, setMode] = useState<'dark' | 'light'>('dark');
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
            await mutate('/api/patreons');
            router.refresh();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally {
            setSaving(false);
        }
    };

    // PerMode helper used by later tasks' subcomponents.
    void ({} as PerMode<string>);

    return (
        <div className={styles.page}>
            {isAdmin && (
                <div className={styles.adminPreviewBanner}>
                    <span>Admin preview:</span>
                    <div className={styles.adminPreviewTierLinks}>
                        {(
                            [
                                'Non-patron',
                                'Tier 1',
                                'Tier 2',
                                'Tier 3',
                            ] as const
                        ).map((label, t) => (
                            <Link
                                key={t}
                                href={`?tier=${t}`}
                                className={styles.adminPreviewTierLink}
                                data-active={
                                    tierOverride === t ||
                                    (tierOverride == null &&
                                        t === effectiveTier)
                                }
                            >
                                {label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
            <div className={styles.header}>
                <h1 className={styles.title}>Nameplate</h1>
                <p className={styles.subtitle}>
                    Customize how your username appears across the site.
                </p>
            </div>
            <TierOverview currentTier={effectiveTier} />
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
            {/* Preview — full width */}
            <div className={styles.previewWrap}>
                <div className={styles.modeTabs} role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mode === 'dark'}
                        className={styles.modeTab}
                        data-active={mode === 'dark'}
                        onClick={() => setMode('dark')}
                    >
                        Dark
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mode === 'light'}
                        className={styles.modeTab}
                        data-active={mode === 'light'}
                        onClick={() => setMode('light')}
                    >
                        Light
                    </button>
                </div>
                <PreviewPane
                    username={session.username}
                    preferences={prefs}
                    tier={effectiveTier}
                    mode={mode}
                />
                <ContrastWarning prefs={prefs} tier={effectiveTier} />
                {!validation.ok && (
                    <div className={styles.errorText}>
                        {validation.errors.map((e, i) => (
                            <div key={i}>{e}</div>
                        ))}
                    </div>
                )}
            </div>

            {/* Settings — two columns */}
            <div className={styles.settingsRow}>
                <div className={styles.settingsCol}>
                    <FillSection
                        prefs={prefs}
                        tier={effectiveTier}
                        mode={mode}
                        username={session.username}
                        onChange={update}
                    />
                    <FontSection
                        prefs={prefs}
                        tier={effectiveTier}
                        onChange={update}
                    />
                </div>
                <div className={styles.settingsCol}>
                    <DisplaySection prefs={prefs} onChange={update} />
                </div>
            </div>

            <div className={styles.actions}>
                <button type="button" className={styles.btn} onClick={resetAll}>
                    Reset
                </button>
                <button
                    type="button"
                    className={`${styles.btn} ${saved ? styles.btnSaved : styles.btnPrimary}`}
                    onClick={onSave}
                    disabled={saving || !validation.ok}
                >
                    {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
                </button>
            </div>
        </div>
    );
}
