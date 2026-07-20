'use client';

import React from 'react';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { Reveal, SlideShell } from '../deck/primitives';

// "The Runner" beat of the cold open: the game slide before this one owns
// the what-is-this-game job, so game/category shrink to a muted line and the
// headshot + narrator hook carry the slide. PB lives on the game slide.
export const IntroSlide: SlideComponent = ({ dossier, stage, prep }) => (
    <SlideShell
        kicker="Next up"
        headline={dossier.runner.username}
        stage={stage}
        backdrop={dossier.game.image}
        avatar={
            // 'noimage' is the profile API's no-avatar sentinel.
            dossier.runner.picture !== 'noimage'
                ? dossier.runner.picture
                : undefined
        }
    >
        <Reveal when={stage >= 0} delayMs={120}>
            <div className={styles.introGameLine}>
                {dossier.game.display} — {dossier.game.category}
            </div>
        </Reveal>
        {prep?.headshotUrl ? (
            <Reveal
                when={stage >= 0}
                delayMs={150}
                className={styles.headshotCard}
            >
                {/* Plain img: headshots live on the media CDN, which is not
                    in next/image remotePatterns. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={prep.headshotUrl} alt="" />
            </Reveal>
        ) : null}
        {prep?.story?.hook ? (
            <Reveal when={stage >= 1}>
                <div className={styles.hookLine}>{prep.story.hook}</div>
            </Reveal>
        ) : null}
        <div className={styles.statRow}>
            {prep?.story?.avgViewers ? (
                <Reveal when={stage >= 2}>
                    <div>
                        <span className={styles.statLabel}>
                            Average viewers
                        </span>
                        <span className={styles.statValue}>
                            {prep.story.avgViewers.toLocaleString()}
                        </span>
                    </div>
                </Reveal>
            ) : null}
            <Reveal when={stage >= 2} delayMs={90}>
                <div>
                    <span className={styles.statLabel}>Attempts</span>
                    <span className={styles.statValue}>
                        {dossier.core.attemptCount.toLocaleString()}
                    </span>
                </div>
            </Reveal>
            {dossier.leaderboards?.pbPlacing ? (
                <Reveal when={stage >= 2} delayMs={180}>
                    <div>
                        <span className={styles.statLabel}>therun.gg rank</span>
                        <span className={styles.statValue}>
                            #{dossier.leaderboards.pbPlacing}
                        </span>
                    </div>
                </Reveal>
            ) : null}
        </div>
    </SlideShell>
);
