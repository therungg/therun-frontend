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
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import styles from './current-user-live-panel.module.scss';

interface CurrentUserLivePanelViewProps {
    initialLiveData: LiveRun;
    username: string;
}

export const CurrentUserLivePanelView: React.FC<
    CurrentUserLivePanelViewProps
> = ({ initialLiveData, username }) => {
    const [liveRun, setLiveRun] = useState<LiveRun | undefined>(
        initialLiveData,
    );
    const lastMessage = useLiveRunsWebsocket(username);
    const { theme } = useTheme();
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        setIsDark(theme !== 'light');
    }, [theme]);

    useEffect(() => {
        if (lastMessage !== null) {
            if (lastMessage.type === 'UPDATE') {
                setLiveRun(lastMessage.run);
            }
            if (lastMessage.type === 'DELETE') {
                setLiveRun(undefined);
            }
        }
    }, [lastMessage]);

    // Hide panel if run ended
    if (!liveRun) {
        return null;
    }

    // Calculate progress percentage for progress bar
    const progressPercentage = liveRun.pb
        ? Math.min(100, (liveRun.currentTime / liveRun.pb) * 100)
        : 0;

    return (
        <Link href={`/live/${username}`} className={styles.panelLink}>
            <div className={styles.liveRunPanel}>
                {/* Game Image or Logo */}
                <div className={styles.imageContainer}>
                    {liveRun.gameImage &&
                    liveRun.gameImage.length > 0 &&
                    liveRun.gameImage !== 'noimage' ? (
                        <GameImage
                            alt={liveRun.game}
                            src={liveRun.gameImage}
                            quality="small"
                            height={120}
                            width={90}
                            className={styles.gameImage}
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
                            className={styles.fallbackLogo}
                        />
                    )}
                </div>

                {/* Main Content */}
                <div className={styles.content}>
                    <div className={styles.header}>
                        <div className={styles.titleSection}>
                            <div className={styles.liveIndicator}>
                                <LiveIcon height={20} dark={isDark} />
                                <span className={styles.liveText}>
                                    Your Live Run
                                </span>
                            </div>
                            {liveRun.currentlyStreaming && (
                                <span className={styles.streamingBadge}>
                                    Streaming
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={styles.gameInfo}>
                        <div className={styles.gameName}>{liveRun.game}</div>
                        <div className={styles.categoryName}>
                            {liveRun.category}
                        </div>
                    </div>

                    <div className={styles.runStats}>
                        <div className={styles.timerSection}>
                            <LiveSplitTimerComponent
                                liveRun={liveRun}
                                dark={isDark}
                                withDiff={false}
                                className={styles.timerBody}
                                timerClassName={styles.timer}
                            />
                        </div>

                        <div className={styles.splitInfo}>
                            <div className={styles.currentSplit}>
                                Split: {liveRun.currentSplitName}
                            </div>
                            {liveRun.pb && (
                                <div className={styles.pbInfo}>
                                    PB:{' '}
                                    <DurationToFormatted
                                        duration={liveRun.pb}
                                    />
                                </div>
                            )}
                            {liveRun.delta !== undefined && (
                                <div
                                    className={`${styles.delta} ${
                                        liveRun.delta >= 0
                                            ? styles.deltaBehind
                                            : styles.deltaAhead
                                    }`}
                                >
                                    {liveRun.delta >= 0 ? '+' : ''}
                                    <DurationToFormatted
                                        duration={Math.abs(liveRun.delta)}
                                    />
                                </div>
                            )}
                        </div>
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
            </div>
        </Link>
    );
};
