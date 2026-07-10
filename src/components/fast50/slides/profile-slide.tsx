'use client';

import React from 'react';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { BigNumber, Reveal, SlideShell } from '../deck/primitives';

export const ProfileSlide: SlideComponent = ({
    dossier,
    evaluation,
    stage,
}) => {
    const pct = Math.round(dossier.core.finishRate * 100);
    return (
        <SlideShell
            kicker="The profile"
            headline={evaluation.headline}
            stage={stage}
        >
            <BigNumber value={pct} play={stage >= 1} format={(n) => `${n}%`} />
            <Reveal when={stage >= 2}>
                <div className={styles.statRow}>
                    <div>
                        <span className={styles.statLabel}>
                            Attempts started
                        </span>
                        <span className={styles.statValue}>
                            {dossier.core.attemptCount.toLocaleString()}
                        </span>
                    </div>
                    <div>
                        <span className={styles.statLabel}>
                            Attempts finished
                        </span>
                        <span className={styles.statValue}>
                            {dossier.core.finishedAttemptCount.toLocaleString()}
                        </span>
                    </div>
                </div>
            </Reveal>
        </SlideShell>
    );
};
