'use client';
import type {
    OutlineSpec,
    PatronPreferences,
    PerMode,
    TextShadowSpec,
} from '../../../../types/patreon.types';
import styles from './customization.module.scss';

const DEFAULT_SHADOW: PerMode<TextShadowSpec> = {
    dark: { color: '#000000', blur: 4 },
    light: { color: '#ffffff', blur: 2 },
};

const DEFAULT_OUTLINE: PerMode<OutlineSpec> = {
    dark: { color: '#000000', width: 1 },
    light: { color: '#ffffff', width: 1 },
};

interface EffectsSectionProps {
    prefs: PatronPreferences;
    onChange: <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => void;
}

export function EffectsSection({ prefs, onChange }: EffectsSectionProps) {
    const shadow = prefs.textShadow;
    const outline = prefs.outline;

    const setShadow = (
        mode: 'dark' | 'light',
        patch: Partial<TextShadowSpec>,
    ) => {
        const base = shadow ?? DEFAULT_SHADOW;
        onChange('textShadow', {
            ...base,
            [mode]: { ...base[mode], ...patch },
        });
    };

    const setOutline = (
        mode: 'dark' | 'light',
        patch: Partial<OutlineSpec>,
    ) => {
        const base = outline ?? DEFAULT_OUTLINE;
        onChange('outline', { ...base, [mode]: { ...base[mode], ...patch } });
    };

    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>Effects</div>

            <div className={styles.cardHeader} style={{ marginTop: '0.25rem' }}>
                Shadow
            </div>
            {(['dark', 'light'] as const).map((mode) => {
                const s = (shadow ?? DEFAULT_SHADOW)[mode];
                return (
                    <div key={mode} className={styles.fieldRow}>
                        <label>{mode === 'dark' ? 'Dark' : 'Light'}</label>
                        <input
                            type="color"
                            value={s.color}
                            onChange={(e) =>
                                setShadow(mode, { color: e.target.value })
                            }
                        />
                        <input
                            type="range"
                            min={0}
                            max={20}
                            value={s.blur}
                            onChange={(e) =>
                                setShadow(mode, {
                                    blur: Number(e.target.value),
                                })
                            }
                        />
                        <span>{s.blur}px</span>
                    </div>
                );
            })}
            <button
                type="button"
                className={styles.chip}
                onClick={() => onChange('textShadow', null)}
                disabled={!shadow}
            >
                Clear shadow
            </button>

            <div className={styles.cardHeader} style={{ marginTop: '0.75rem' }}>
                Outline
            </div>
            {(['dark', 'light'] as const).map((mode) => {
                const o = (outline ?? DEFAULT_OUTLINE)[mode];
                return (
                    <div key={mode} className={styles.fieldRow}>
                        <label>{mode === 'dark' ? 'Dark' : 'Light'}</label>
                        <input
                            type="color"
                            value={o.color}
                            onChange={(e) =>
                                setOutline(mode, { color: e.target.value })
                            }
                        />
                        <input
                            type="range"
                            min={0}
                            max={3}
                            step={0.5}
                            value={o.width}
                            onChange={(e) =>
                                setOutline(mode, {
                                    width: Number(e.target.value),
                                })
                            }
                        />
                        <span>{o.width}px</span>
                    </div>
                );
            })}
            <button
                type="button"
                className={styles.chip}
                onClick={() => onChange('outline', null)}
                disabled={!outline}
            >
                Clear outline
            </button>
        </section>
    );
}
