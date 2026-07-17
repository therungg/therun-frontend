'use client';

import React from 'react';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { Reveal, SlideShell } from '../deck/primitives';

export const IntroSlide: SlideComponent = ({ dossier, stage }) => (
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
            <div className={styles.introGame}>
                <div className={styles.introGameTitle}>
                    {dossier.game.display}
                </div>
                <div className={styles.introCategory}>
                    {dossier.game.category}
                </div>
            </div>
        </Reveal>
        <div className={styles.statRow}>
            <Reveal when={stage >= 1}>
                <div>
                    <span className={styles.statLabel}>Personal best</span>
                    <span className={styles.statValuePb}>
                        {formatTimeMs(dossier.core.pbMs)}
                    </span>
                </div>
            </Reveal>
            <Reveal when={stage >= 2}>
                <div>
                    <span className={styles.statLabel}>Attempts</span>
                    <span className={styles.statValue}>
                        {dossier.core.attemptCount.toLocaleString()}
                    </span>
                </div>
            </Reveal>
            {dossier.leaderboards?.pbPlacing ? (
                <Reveal when={stage >= 2} delayMs={90}>
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
