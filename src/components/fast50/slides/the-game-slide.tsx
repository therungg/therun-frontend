'use client';

import clsx from 'clsx';
import React from 'react';
import { GameImage } from '~src/components/image/gameimage';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { Reveal } from '../deck/primitives';

// Casual playthroughs are coarse numbers — "~40 hours" reads better on a
// broadcast than 40:00:00. Short games keep the precise clock.
const casualLabel = (ms: number) =>
    ms >= 2 * 3_600_000
        ? `~${Math.round(ms / 3_600_000)} hours`
        : formatTimeMs(ms);

export const TheGameSlide: SlideComponent = ({ dossier, stage, prep }) => {
    const story = prep?.story;
    const userCount = dossier.community?.userCount;
    const scarcity = userCount
        ? userCount === 1
            ? 'The only person on therun.gg who runs this category'
            : `${userCount.toLocaleString()} runners on therun.gg run this category`
        : undefined;
    const subline = story?.gameBlurb ?? scarcity;

    return (
        <div className={styles.slide}>
            {story?.brollUrl ? (
                <div className={styles.broll}>
                    <video
                        src={story.brollUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                    />
                </div>
            ) : dossier.game.image ? (
                <div className={clsx(styles.backdrop, styles.backdropLoud)}>
                    <GameImage
                        src={dossier.game.image}
                        quality="hd"
                        alt=""
                        fill={false}
                        width={480}
                        height={640}
                    />
                </div>
            ) : null}
            <div className={styles.slideContent}>
                <div className={styles.kicker}>The game</div>
                <Reveal when={stage >= 0}>
                    <h1 className={styles.headline}>{dossier.game.display}</h1>
                    <div className={styles.introCategory}>
                        {dossier.game.category}
                    </div>
                </Reveal>
                {subline ? (
                    <Reveal when={stage >= 1}>
                        <div className={styles.gameBlurb}>{subline}</div>
                    </Reveal>
                ) : null}
                <Reveal when={stage >= 2}>
                    {story?.casualTimeMs ? (
                        <div className={styles.contrastRow}>
                            <div>
                                <span className={styles.statLabel}>
                                    A casual playthrough
                                </span>
                                <span className={styles.contrastValue}>
                                    {casualLabel(story.casualTimeMs)}
                                </span>
                            </div>
                            <span className={styles.contrastVs}>vs</span>
                            <div>
                                <span className={styles.statLabel}>
                                    {dossier.runner.username}&apos;s best
                                </span>
                                <span
                                    className={clsx(
                                        styles.contrastValue,
                                        styles.contrastAccent,
                                    )}
                                >
                                    {formatTimeMs(dossier.core.pbMs)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.statRow}>
                            <div>
                                <span className={styles.statLabel}>
                                    Personal best
                                </span>
                                <span className={styles.statValuePb}>
                                    {formatTimeMs(dossier.core.pbMs)}
                                </span>
                            </div>
                        </div>
                    )}
                </Reveal>
            </div>
        </div>
    );
};
