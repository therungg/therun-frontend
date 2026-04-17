'use client';
import type {
    PatronPreferences,
    PerMode,
} from '../../../../types/patreon.types';
import styles from './customization.module.scss';
import { TierLock } from './tier-lock';

const DEFAULT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const DEFAULT_ANGLE: PerMode<number> = { dark: 90, light: 90 };

interface GradientPickerProps {
    tier: number;
    mode: 'dark' | 'light';
    stops: PerMode<string[]>;
    onStopsChange: (next: PerMode<string[]>) => void;
    angle: PerMode<number> | null;
    onAngleChange: (next: PerMode<number>) => void;
    animated: boolean;
    onAnimatedChange: (next: boolean) => void;
}

export function GradientPicker({
    tier,
    mode,
    stops,
    onStopsChange,
    angle,
    onAngleChange,
    animated,
    onAnimatedChange,
}: GradientPickerProps) {
    const resolvedAngle = angle ?? DEFAULT_ANGLE;
    const other = mode === 'dark' ? 'light' : 'dark';

    const setStop = (idx: number, color: string) => {
        const next = { ...stops, [mode]: stops[mode].slice() };
        next[mode][idx] = color;
        onStopsChange(next);
    };

    const addStop = () => {
        if (stops[mode].length >= 6) return;
        onStopsChange({ ...stops, [mode]: [...stops[mode], '#ffffff'] });
    };

    const removeStop = (idx: number) => {
        if (stops[mode].length <= 2) return;
        onStopsChange({
            ...stops,
            [mode]: stops[mode].filter((_, i) => i !== idx),
        });
    };

    const copyToOther = () => {
        onStopsChange({ ...stops, [other]: stops[mode].slice() });
        onAngleChange({ ...resolvedAngle, [other]: resolvedAngle[mode] });
    };

    const setAngle = (value: number) => {
        const clamped = Math.max(0, Math.min(360, value));
        onAngleChange({ ...resolvedAngle, [mode]: clamped });
    };

    return (
        <div>
            <div className={styles.cardHeader}>Stops</div>
            {stops[mode].map((c, i) => (
                <div key={i} className={styles.stopRow}>
                    <input
                        type="color"
                        value={c}
                        onChange={(e) => setStop(i, e.target.value)}
                    />
                    <span>{c}</span>
                    <button
                        type="button"
                        className={styles.chip}
                        onClick={() => removeStop(i)}
                        disabled={stops[mode].length <= 2}
                    >
                        ✕
                    </button>
                </div>
            ))}
            <button
                type="button"
                className={styles.chip}
                onClick={addStop}
                disabled={stops[mode].length >= 6}
            >
                + Add stop
            </button>

            <TierLock
                requiredTier={3}
                currentTier={tier}
                label="angle & animation"
            >
                <div
                    className={styles.cardHeader}
                    style={{ marginTop: '0.75rem' }}
                >
                    Angle
                </div>
                <div className={styles.angleChips}>
                    {DEFAULT_ANGLES.map((a) => (
                        <button
                            key={a}
                            type="button"
                            className={styles.chip}
                            data-active={resolvedAngle[mode] === a}
                            onClick={() => setAngle(a)}
                        >
                            {a}°
                        </button>
                    ))}
                    <input
                        type="number"
                        min={0}
                        max={360}
                        value={resolvedAngle[mode]}
                        onChange={(e) => setAngle(Number(e.target.value))}
                        style={{ width: '5rem' }}
                    />
                </div>

                <button
                    type="button"
                    className={styles.chip}
                    onClick={copyToOther}
                    style={{ marginTop: '0.5rem' }}
                >
                    Copy gradient to {other} mode
                </button>

                <label
                    className={styles.fieldRow}
                    style={{ marginTop: '0.75rem' }}
                >
                    <input
                        type="checkbox"
                        checked={animated}
                        onChange={(e) => onAnimatedChange(e.target.checked)}
                    />
                    <span>Animate gradient</span>
                </label>
            </TierLock>
        </div>
    );
}
