'use client';
import type { LegacyPresetEntry } from '~src/components/patreon/legacy-preset-map';
import { LEGACY_PRESETS } from '~src/components/patreon/legacy-preset-map';
import { buildPatronStyle } from '~src/components/patreon/patron-style';
import type { PatronPreferences } from '../../../../types/patreon.types';
import styles from './customization.module.scss';

const CURATED_IDS = [
    0, 100, 101, 102, 104, 105, 106, 107, 200, 201, 202, 204, 205, 207, 208,
    209, 210, 211, 212,
];

interface PresetsTabProps {
    tier: number;
    mode: 'dark' | 'light';
    username: string;
    prefs: PatronPreferences;
    onApply: (entry: LegacyPresetEntry) => void;
}

function isActive(prefs: PatronPreferences, id: number): boolean {
    const entry = LEGACY_PRESETS.find((p) => p.id === id);
    if (!entry) return false;
    if (entry.kind === 'solid') {
        return (
            prefs.customColor?.dark === entry.value.dark &&
            prefs.customColor?.light === entry.value.light &&
            !prefs.customGradient
        );
    }
    const g = prefs.customGradient;
    if (!g) return false;
    return (
        g.dark.join(',') === entry.value.dark.join(',') &&
        g.light.join(',') === entry.value.light.join(',')
    );
}

export function PresetsTab({
    tier,
    mode,
    username,
    prefs,
    onApply,
}: PresetsTabProps) {
    // Solid presets available to all (tier 1+); gradient presets require tier 2+.
    const items = LEGACY_PRESETS.filter(
        (p) => CURATED_IDS.includes(p.id) && (p.kind === 'solid' || tier >= 2),
    );

    return (
        <div className={styles.presetGrid}>
            {items.map((entry) => {
                const fakePrefs: PatronPreferences = {
                    hide: false,
                    featureInScrollbar: true,
                    featureOnOverview: true,
                    showIcon: true,
                    customColor: entry.kind === 'solid' ? entry.value : null,
                    customGradient:
                        entry.kind === 'gradient' ? entry.value : null,
                };
                const style = buildPatronStyle(fakePrefs, tier, mode);
                const active = isActive(prefs, entry.id);
                const splitClass =
                    mode === 'dark'
                        ? `${styles.presetSplit} ${styles.presetDark}`
                        : `${styles.presetSplit} ${styles.presetLight}`;
                return (
                    <button
                        key={entry.id}
                        type="button"
                        className={styles.presetTile}
                        data-active={active}
                        onClick={() => onApply(entry)}
                    >
                        <div className={splitClass}>
                            <span style={style}>{username}</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
