'use client';
import type {
    PatronPreferences,
    PerMode,
} from '../../../../types/patreon.types';
import styles from './customization.module.scss';

const DEFAULT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const DEFAULT_ANGLE: PerMode<number> = { dark: 90, light: 90 };

interface GradientPickerProps {
    stops: PerMode<string[]>;
    onStopsChange: (next: PerMode<string[]>) => void;
    angle: PerMode<number> | null;
    onAngleChange: (next: PerMode<number>) => void;
    animated: boolean;
    onAnimatedChange: (next: boolean) => void;
}

export function GradientPicker({
    stops,
    onStopsChange,
    angle,
    onAngleChange,
    animated,
    onAnimatedChange,
}: GradientPickerProps) {
    const resolvedAngle = angle ?? DEFAULT_ANGLE;

    const setStop = (mode: 'dark' | 'light', idx: number, color: string) => {
        const next = { ...stops, [mode]: stops[mode].slice() };
        next[mode][idx] = color;
        onStopsChange(next);
    };

    const addStop = (mode: 'dark' | 'light') => {
        if (stops[mode].length >= 6) return;
        const next = { ...stops, [mode]: [...stops[mode], '#ffffff'] };
        onStopsChange(next);
    };

    const removeStop = (mode: 'dark' | 'light', idx: number) => {
        if (stops[mode].length <= 2) return;
        const next = {
            ...stops,
            [mode]: stops[mode].filter((_, i) => i !== idx),
        };
        onStopsChange(next);
    };

    const copyDarkToLight = () => {
        onStopsChange({ dark: stops.dark, light: stops.dark.slice() });
    };

    const setAngle = (mode: 'dark' | 'light', value: number) => {
        const clamped = Math.max(0, Math.min(360, value));
        onAngleChange({ ...resolvedAngle, [mode]: clamped });
    };

    return (
        <div>
            {(['dark', 'light'] as const).map((mode) => (
                <div key={mode}>
                    <div className={styles.cardHeader}>
                        {mode === 'dark'
                            ? 'Dark mode stops'
                            : 'Light mode stops'}
                    </div>
                    {stops[mode].map((c, i) => (
                        <div key={i} className={styles.stopRow}>
                            <input
                                type="color"
                                value={c}
                                onChange={(e) =>
                                    setStop(mode, i, e.target.value)
                                }
                            />
                            <span>{c}</span>
                            <button
                                type="button"
                                className={styles.chip}
                                onClick={() => removeStop(mode, i)}
                                disabled={stops[mode].length <= 2}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        className={styles.chip}
                        onClick={() => addStop(mode)}
                        disabled={stops[mode].length >= 6}
                    >
                        + Add stop
                    </button>

                    <div
                        className={styles.cardHeader}
                        style={{ marginTop: '0.75rem' }}
                    >
                        Angle ({mode})
                    </div>
                    <div className={styles.angleChips}>
                        {DEFAULT_ANGLES.map((a) => (
                            <button
                                key={a}
                                type="button"
                                className={styles.chip}
                                data-active={resolvedAngle[mode] === a}
                                onClick={() => setAngle(mode, a)}
                            >
                                {a}°
                            </button>
                        ))}
                        <input
                            type="number"
                            min={0}
                            max={360}
                            value={resolvedAngle[mode]}
                            onChange={(e) =>
                                setAngle(mode, Number(e.target.value))
                            }
                            style={{ width: '5rem' }}
                        />
                    </div>
                </div>
            ))}

            <button
                type="button"
                className={styles.chip}
                onClick={copyDarkToLight}
            >
                Copy dark stops → light
            </button>

            <label className={styles.fieldRow} style={{ marginTop: '0.75rem' }}>
                <input
                    type="checkbox"
                    checked={animated}
                    onChange={(e) => onAnimatedChange(e.target.checked)}
                />
                <span>Animate gradient</span>
            </label>
        </div>
    );
}
