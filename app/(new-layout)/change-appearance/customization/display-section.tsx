'use client';
import Switch from 'react-switch';
import { PatreonBunnySvg } from '~app/(new-layout)/patron/patreon-info';
import type { PatronPreferences } from '../../../../types/patreon.types';
import styles from './customization.module.scss';

interface DisplaySectionProps {
    prefs: PatronPreferences;
    onChange: <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => void;
}

export function DisplaySection({ prefs, onChange }: DisplaySectionProps) {
    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>Display preferences</div>

            <label className={styles.fieldRow}>
                <Switch
                    onChange={(v) => onChange('hide', !v)}
                    checked={!prefs.hide}
                />
                <span>
                    Display me as Patreon (overrides all other settings when
                    off)
                </span>
            </label>

            <label className={styles.fieldRow}>
                <Switch
                    onChange={(v) => onChange('showIcon', v)}
                    checked={prefs.showIcon}
                />
                <span>
                    Show the <PatreonBunnySvg /> next to my name
                </span>
            </label>

            <label className={styles.fieldRow}>
                <Switch
                    onChange={(v) => onChange('featureOnOverview', v)}
                    checked={prefs.featureOnOverview}
                />
                <span>Display my name on the Support page</span>
            </label>
        </section>
    );
}
