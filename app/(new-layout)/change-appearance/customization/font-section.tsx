'use client';
import type { PatronPreferences } from '../../../../types/patreon.types';
import styles from './customization.module.scss';

interface FontSectionProps {
    prefs: PatronPreferences;
    onChange: <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => void;
}

export function FontSection({ prefs, onChange }: FontSectionProps) {
    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>Font</div>
            <div className={styles.fieldRow}>
                <button
                    type="button"
                    className={styles.chip}
                    data-active={!!prefs.bold}
                    onClick={() => onChange('bold', !prefs.bold)}
                    aria-pressed={!!prefs.bold}
                    style={{ fontWeight: 700 }}
                >
                    B
                </button>
                <button
                    type="button"
                    className={styles.chip}
                    data-active={!!prefs.italic}
                    onClick={() => onChange('italic', !prefs.italic)}
                    aria-pressed={!!prefs.italic}
                    style={{ fontStyle: 'italic' }}
                >
                    I
                </button>
            </div>
        </section>
    );
}
