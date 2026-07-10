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
        <Reveal when={stage >= 1}>
            <div className={styles.introGame}>
                {dossier.game.display} — {dossier.game.category}
            </div>
        </Reveal>
        <Reveal when={stage >= 2}>
            <div className={styles.statRow}>
                <div>
                    <span className={styles.statLabel}>Personal best</span>
                    <span className={styles.statValue}>
                        {formatTimeMs(dossier.core.pbMs)}
                    </span>
                </div>
                <div>
                    <span className={styles.statLabel}>Attempts</span>
                    <span className={styles.statValue}>
                        {dossier.core.attemptCount.toLocaleString()}
                    </span>
                </div>
                {dossier.leaderboards?.pbPlacing ? (
                    <div>
                        <span className={styles.statLabel}>therun.gg rank</span>
                        <span className={styles.statValue}>
                            #{dossier.leaderboards.pbPlacing}
                        </span>
                    </div>
                ) : null}
            </div>
        </Reveal>
    </SlideShell>
);
