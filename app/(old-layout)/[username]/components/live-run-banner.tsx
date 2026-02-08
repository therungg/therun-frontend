'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { LiveRun } from '~app/(old-layout)/live/live.types';
import { LiveSplitTimerComponent } from '~app/(old-layout)/live/live-split-timer.component';
import { GameImage } from '~src/components/image/gameimage';
import { LiveIcon } from '~src/components/live/live-user-run';
import { DurationToFormatted } from '~src/components/util/datetime';
import styles from '../profile.module.scss';

interface LiveRunBannerProps {
    liveRun: LiveRun;
    username: string;
}

export const LiveRunBanner: React.FC<LiveRunBannerProps> = ({
    liveRun,
    username,
}) => {
    const { theme } = useTheme();
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        setIsDark(theme !== 'light');
    }, [theme]);

    // Calculate progress percentage for progress bar
    const progressPercentage = liveRun.pb
        ? Math.min(100, (liveRun.currentTime / liveRun.pb) * 100)
        : 0;

    return (
        <Link href={`/live/${username}`} className={styles.liveRunBanner}>
            {/* Game Image or Logo */}
            <div className={styles.bannerImage}>
                {liveRun.gameImage &&
                liveRun.gameImage.length > 0 &&
                liveRun.gameImage !== 'noimage' ? (
                    <GameImage
                        alt={liveRun.game}
                        src={liveRun.gameImage}
                        quality="small"
                        height={120}
                        width={90}
                    />
                ) : (
                    <Image
                        alt="Logo"
                        src={
                            isDark
                                ? '/logo_dark_theme_no_text_transparent.png'
                                : '/logo_light_theme_no_text_transparent.png'
                        }
                        width={75}
                        height={75}
                    />
                )}
            </div>

            {/* Main Content */}
            <div className={styles.bannerContent}>
                <div>
                    <LiveIcon height={20} dark={isDark} />
                    <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>
                        Live Run
                    </span>
                </div>

                <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {liveRun.game}
                    </div>
                    <div style={{ opacity: 0.7 }}>{liveRun.category}</div>
                </div>

                <div className={styles.bannerTimer}>
                    <LiveSplitTimerComponent
                        liveRun={liveRun}
                        dark={isDark}
                        withDiff={false}
                    />
                </div>

                <div className={styles.bannerSplitInfo}>
                    <div>Split: {liveRun.currentSplitName}</div>
                    {liveRun.pb && (
                        <div>
                            PB: <DurationToFormatted duration={liveRun.pb} />
                        </div>
                    )}
                    {liveRun.delta !== undefined && (
                        <div
                            className={
                                liveRun.delta >= 0
                                    ? styles.deltaBehind
                                    : styles.deltaAhead
                            }
                        >
                            {liveRun.delta >= 0 ? '+' : ''}
                            <DurationToFormatted
                                duration={Math.abs(liveRun.delta)}
                            />
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                {liveRun.pb && (
                    <div className={styles.progressBarContainer}>
                        <div
                            className={styles.progressBar}
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                )}
            </div>
        </Link>
    );
};
