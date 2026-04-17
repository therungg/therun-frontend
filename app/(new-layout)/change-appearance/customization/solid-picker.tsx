'use client';
import type { PerMode } from '../../../../types/patreon.types';
import styles from './customization.module.scss';

interface SolidPickerProps {
    mode: 'dark' | 'light';
    value: PerMode<string>;
    onChange: (next: PerMode<string>) => void;
}

export function SolidPicker({ mode, value, onChange }: SolidPickerProps) {
    const other = mode === 'dark' ? 'light' : 'dark';
    return (
        <div>
            <div className={styles.fieldRow}>
                <label>Color</label>
                <input
                    type="color"
                    value={value[mode]}
                    onChange={(e) =>
                        onChange({ ...value, [mode]: e.target.value })
                    }
                />
                <span>{value[mode]}</span>
                <button
                    type="button"
                    className={styles.chip}
                    onClick={() => onChange({ ...value, [other]: value[mode] })}
                    title={`Copy to ${other} mode`}
                >
                    Copy to {other}
                </button>
            </div>
        </div>
    );
}
