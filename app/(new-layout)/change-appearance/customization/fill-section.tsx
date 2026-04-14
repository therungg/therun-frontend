'use client';
import type {
    PatronPreferences,
    PerMode,
} from '../../../../types/patreon.types';
import styles from './customization.module.scss';
import { GradientPicker } from './gradient-picker';
import { SolidPicker } from './solid-picker';

const DEFAULT_SOLID: PerMode<string> = { dark: '#ffffff', light: '#000000' };
const DEFAULT_GRADIENT: PerMode<string[]> = {
    dark: ['#ffffff', '#888888'],
    light: ['#000000', '#888888'],
};

type Mode = 'solid' | 'gradient';

function currentMode(prefs: PatronPreferences): Mode {
    if (prefs.customGradient) return 'gradient';
    return 'solid';
}

interface FillSectionProps {
    prefs: PatronPreferences;
    tier: number;
    onChange: <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => void;
}

export function FillSection({ prefs, tier, onChange }: FillSectionProps) {
    const mode = currentMode(prefs);

    const switchToSolid = () => {
        onChange('customColor', prefs.customColor ?? DEFAULT_SOLID);
        onChange('customGradient', null);
    };

    const switchToGradient = () => {
        onChange('customGradient', prefs.customGradient ?? DEFAULT_GRADIENT);
        onChange('customColor', null);
        if (!prefs.gradientAngle) {
            onChange('gradientAngle', { dark: 90, light: 90 });
        }
    };

    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>Fill</div>
            <div className={styles.fieldRow}>
                <label>
                    <input
                        type="radio"
                        name="fill-mode"
                        checked={mode === 'solid'}
                        onChange={switchToSolid}
                    />{' '}
                    Solid
                </label>
                {tier >= 3 && (
                    <label>
                        <input
                            type="radio"
                            name="fill-mode"
                            checked={mode === 'gradient'}
                            onChange={switchToGradient}
                        />{' '}
                        Gradient
                    </label>
                )}
            </div>

            {mode === 'solid' && (
                <SolidPicker
                    value={prefs.customColor ?? DEFAULT_SOLID}
                    onChange={(v) => onChange('customColor', v)}
                />
            )}

            {mode === 'gradient' && tier >= 3 && (
                <GradientPicker
                    stops={prefs.customGradient ?? DEFAULT_GRADIENT}
                    onStopsChange={(v) => onChange('customGradient', v)}
                    angle={prefs.gradientAngle ?? null}
                    onAngleChange={(v) => onChange('gradientAngle', v)}
                    animated={!!prefs.gradientAnimated}
                    onAnimatedChange={(v) => onChange('gradientAnimated', v)}
                />
            )}
        </section>
    );
}
