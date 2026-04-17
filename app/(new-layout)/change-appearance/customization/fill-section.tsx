'use client';
import { useState } from 'react';
import type { LegacyPresetEntry } from '~src/components/patreon/legacy-preset-map';
import type {
    PatronPreferences,
    PerMode,
} from '../../../../types/patreon.types';
import styles from './customization.module.scss';
import { GradientPicker } from './gradient-picker';
import { PresetsTab } from './presets-tab';
import { SolidPicker } from './solid-picker';

const DEFAULT_SOLID: PerMode<string> = { dark: '#ffffff', light: '#000000' };
const DEFAULT_GRADIENT: PerMode<string[]> = {
    dark: ['#ffffff', '#888888'],
    light: ['#000000', '#888888'],
};
const DEFAULT_ANGLE: PerMode<number> = { dark: 90, light: 90 };

type FillTab = 'solid' | 'gradient' | 'presets';

interface FillSectionProps {
    prefs: PatronPreferences;
    tier: number;
    mode: 'dark' | 'light';
    username: string;
    onChange: <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => void;
}

export function FillSection({
    prefs,
    tier,
    mode,
    username,
    onChange,
}: FillSectionProps) {
    // Independent drafts — survive tab switches.
    const [solidDraft, setSolidDraft] = useState<PerMode<string>>(
        prefs.customColor ?? DEFAULT_SOLID,
    );
    const [gradientDraft, setGradientDraft] = useState<PerMode<string[]>>(
        prefs.customGradient ?? DEFAULT_GRADIENT,
    );
    const [angleDraft, setAngleDraft] = useState<PerMode<number>>(
        prefs.gradientAngle ?? DEFAULT_ANGLE,
    );

    const [tab, setTab] = useState<FillTab>(
        prefs.customGradient ? 'gradient' : 'solid',
    );

    // Push the solid draft to parent and switch tab.
    const selectSolid = () => {
        onChange('customColor', solidDraft);
        onChange('customGradient', null);
        setTab('solid');
    };

    // Push the gradient draft to parent and switch tab.
    const selectGradient = () => {
        onChange('customGradient', gradientDraft);
        onChange('customColor', null);
        onChange('gradientAngle', angleDraft);
        setTab('gradient');
    };

    const selectPresets = () => setTab('presets');

    // Solid edits — update draft and parent (for live preview).
    const handleSolidChange = (v: PerMode<string>) => {
        setSolidDraft(v);
        onChange('customColor', v);
    };

    // Gradient edits — update drafts and parent.
    const handleGradientStopsChange = (v: PerMode<string[]>) => {
        setGradientDraft(v);
        onChange('customGradient', v);
    };

    const handleAngleChange = (v: PerMode<number>) => {
        setAngleDraft(v);
        onChange('gradientAngle', v);
    };

    // Preset apply — update the relevant draft, push to parent, switch tab.
    const handlePresetApply = (entry: LegacyPresetEntry) => {
        if (entry.kind === 'solid') {
            setSolidDraft(entry.value);
            onChange('customColor', entry.value);
            onChange('customGradient', null);
            setTab('solid');
        } else {
            setGradientDraft(entry.value);
            onChange('customGradient', entry.value);
            onChange('customColor', null);
            onChange('gradientAngle', angleDraft);
            setTab('gradient');
        }
    };

    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>Fill</div>
            <div
                className={styles.modeTabs}
                role="tablist"
                style={{ marginBottom: '0.75rem' }}
            >
                <button
                    type="button"
                    className={styles.modeTab}
                    data-active={tab === 'solid'}
                    onClick={selectSolid}
                >
                    Solid
                </button>
                {tier >= 2 ? (
                    <button
                        type="button"
                        className={styles.modeTab}
                        data-active={tab === 'gradient'}
                        onClick={selectGradient}
                    >
                        Gradient
                    </button>
                ) : (
                    <button
                        type="button"
                        className={`${styles.modeTab} ${styles.modeTabLocked}`}
                        disabled
                        title="Requires Tier 2 — upgrade to unlock gradients"
                    >
                        Gradient
                        <span className={styles.tierPill}>2</span>
                    </button>
                )}
                <button
                    type="button"
                    className={styles.modeTab}
                    data-active={tab === 'presets'}
                    onClick={selectPresets}
                >
                    Presets
                </button>
            </div>

            {tab === 'solid' && (
                <SolidPicker
                    mode={mode}
                    value={solidDraft}
                    onChange={handleSolidChange}
                />
            )}

            {tab === 'gradient' && tier >= 2 && (
                <GradientPicker
                    tier={tier}
                    mode={mode}
                    stops={gradientDraft}
                    onStopsChange={handleGradientStopsChange}
                    angle={angleDraft}
                    onAngleChange={handleAngleChange}
                    animated={!!prefs.gradientAnimated}
                    onAnimatedChange={(v) => onChange('gradientAnimated', v)}
                />
            )}

            {tab === 'presets' && (
                <PresetsTab
                    tier={tier}
                    mode={mode}
                    username={username}
                    prefs={prefs}
                    onApply={handlePresetApply}
                />
            )}
        </section>
    );
}
