'use client';
import {
    type LegacyPresetEntry,
    legacyPresetMap,
} from '~src/components/patreon/legacy-preset-map';
import { buildPatronStyle } from '~src/components/patreon/patron-style';
import type { PatronPreferences } from '../../../../types/patreon.types';
import styles from './customization.module.scss';

// Curated shortlist — visually distinct, covers solid + gradient across tiers.
const CURATED_IDS = [0, 100, 101, 106, 200, 202, 205, 210, 207] as const;

interface PresetShortcutsProps {
    tier: number;
    username: string;
    onChange: <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => void;
}

export function PresetShortcuts({
    tier,
    username,
    onChange,
}: PresetShortcutsProps) {
    const items = CURATED_IDS.map((id) => ({
        id,
        entry: legacyPresetMap(id)!,
    })).filter(({ entry }) => entry.tier <= tier);

    const apply = (id: number, entry: LegacyPresetEntry) => {
        if (entry.kind === 'solid') {
            onChange('customColor', entry.value);
            onChange('customGradient', null);
        } else {
            onChange('customGradient', entry.value);
            onChange('customColor', null);
        }
    };

    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>Presets</div>
            <div className={styles.presetGrid}>
                {items.map(({ id, entry }) => {
                    const fakePrefs: PatronPreferences = {
                        hide: false,
                        featureInScrollbar: true,
                        featureOnOverview: true,
                        showIcon: true,
                        customColor:
                            entry.kind === 'solid' ? entry.value : null,
                        customGradient:
                            entry.kind === 'gradient' ? entry.value : null,
                    };
                    const previewStyle = buildPatronStyle(
                        fakePrefs,
                        entry.tier,
                        'dark',
                    );
                    return (
                        <button
                            key={id}
                            type="button"
                            className={styles.presetTile}
                            onClick={() => apply(id, entry)}
                            title={
                                entry.kind === 'solid'
                                    ? 'Apply as solid color'
                                    : 'Apply as gradient'
                            }
                        >
                            <span style={previewStyle}>{username}</span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
