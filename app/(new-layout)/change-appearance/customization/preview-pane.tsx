'use client';
import { buildPatronStyle } from '~src/components/patreon/patron-style';
import type { PatronPreferences } from '../../../../types/patreon.types';
import styles from './customization.module.scss';

interface PreviewPaneProps {
    username: string;
    preferences: PatronPreferences;
    tier: number;
}

export function PreviewPane({ username, preferences, tier }: PreviewPaneProps) {
    const darkStyle = buildPatronStyle(preferences, tier, 'dark');
    const lightStyle = buildPatronStyle(preferences, tier, 'light');
    return (
        <>
            <div className={`${styles.previewBox} ${styles.previewDark}`}>
                <span style={darkStyle}>{username}</span>
            </div>
            <div className={`${styles.previewBox} ${styles.previewLight}`}>
                <span style={lightStyle}>{username}</span>
            </div>
        </>
    );
}
