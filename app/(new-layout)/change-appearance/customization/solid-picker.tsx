'use client';
import type { PerMode } from '../../../../types/patreon.types';
import styles from './customization.module.scss';

interface SolidPickerProps {
    value: PerMode<string>;
    onChange: (next: PerMode<string>) => void;
}

function normalizeHex(v: string): string {
    // <input type="color"> already returns #rrggbb lowercase.
    return v;
}

export function SolidPicker({ value, onChange }: SolidPickerProps) {
    return (
        <div>
            <div className={styles.fieldRow}>
                <label>Dark mode</label>
                <input
                    type="color"
                    value={value.dark}
                    onChange={(e) =>
                        onChange({
                            ...value,
                            dark: normalizeHex(e.target.value),
                        })
                    }
                />
                <span>{value.dark}</span>
                <button
                    type="button"
                    className={styles.chip}
                    onClick={() =>
                        onChange({ dark: value.dark, light: value.dark })
                    }
                    title="Copy dark → light"
                >
                    ↓
                </button>
            </div>
            <div className={styles.fieldRow}>
                <label>Light mode</label>
                <input
                    type="color"
                    value={value.light}
                    onChange={(e) =>
                        onChange({
                            ...value,
                            light: normalizeHex(e.target.value),
                        })
                    }
                />
                <span>{value.light}</span>
                <button
                    type="button"
                    className={styles.chip}
                    onClick={() =>
                        onChange({ dark: value.light, light: value.light })
                    }
                    title="Copy light → dark"
                >
                    ↑
                </button>
            </div>
        </div>
    );
}
