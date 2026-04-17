'use client';
import type { CSSProperties } from 'react';
import { PatreonBunnySvg } from '~app/(new-layout)/patron/patreon-info';
import {
    buildPatronStyle,
    resolveFill,
} from '~src/components/patreon/patron-style';
import type { PatronPreferences } from '../../../../types/patreon.types';
import styles from './customization.module.scss';

interface PreviewPaneProps {
    username: string;
    preferences: PatronPreferences;
    tier: number;
    mode: 'dark' | 'light';
}

export function PreviewPane({
    username,
    preferences,
    tier,
    mode,
}: PreviewPaneProps) {
    const style = buildPatronStyle(preferences, tier, mode);
    const boxClass =
        mode === 'dark'
            ? `${styles.previewBox} ${styles.previewDark}`
            : `${styles.previewBox} ${styles.previewLight}`;

    const hidden = preferences.hide;
    const fill = hidden ? null : resolveFill(preferences, tier, mode);
    const isGradient = fill?.kind === 'gradient';
    const patronPrimary = fill ? (isGradient ? fill.value[0] : fill.value) : '';
    const angle = preferences.gradientAngle?.[mode] ?? 90;
    const patronGradient = isGradient
        ? `linear-gradient(${angle}deg, ${fill.value.join(', ')})`
        : '';
    const cappedTier = Math.min(tier, 3);

    const cardStyleVars = {
        '--patron-primary': patronPrimary || undefined,
        '--patron-gradient': patronGradient || undefined,
    } as CSSProperties;

    return (
        <>
            <div className={boxClass}>
                <span style={style}>
                    {username}
                    {preferences.showIcon && (
                        <span className={styles.previewBunny}>
                            <PatreonBunnySvg size={22} />
                        </span>
                    )}
                </span>
            </div>

            <div className={styles.livePreviewLabel}>
                <span>Live page preview</span>
                <span className={styles.livePreviewLabelHint}>
                    — how your card looks on /live
                </span>
            </div>
            <div
                className={styles.liveCard}
                data-mode={mode}
                data-has-patron={!hidden}
                data-tier={cappedTier}
                data-gradient={isGradient}
                data-animated={isGradient && !!preferences.gradientAnimated}
                style={cardStyleVars}
            >
                <div className={styles.liveCardAvatar} />
                <div className={styles.liveCardBody}>
                    <span className={styles.liveCardName}>
                        <span style={style}>{username}</span>
                        {preferences.showIcon && !hidden && (
                            <span className={styles.liveCardBunny}>
                                <PatreonBunnySvg size={16} />
                            </span>
                        )}
                    </span>
                    <span className={styles.liveCardGame}>
                        Super Mario 64 · 120 Star
                    </span>
                </div>
                <span className={styles.liveCardTimer}>1:41:23</span>
            </div>
            {!hidden && (
                <div className={styles.livePreviewCaption}>
                    Visitors see these colors next to your name and card — a
                    signal you support therun.gg.
                </div>
            )}
        </>
    );
}
