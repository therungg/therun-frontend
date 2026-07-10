'use client';

import React from 'react';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import {
    BigNumber,
    DistributionStrip,
    Reveal,
    SlideShell,
} from '../deck/primitives';

export const ZoomOutSlide: SlideComponent = ({
    dossier,
    evaluation,
    stage,
}) => {
    const { postRun } = dossier;
    if (!postRun) return null;

    return (
        <SlideShell
            kicker="Zoom out"
            headline={evaluation.headline}
            stage={stage}
        >
            <BigNumber
                value={dossier.core.attemptCount + 1}
                play={stage >= 1}
                format={(n) => `#${n.toLocaleString()}`}
            />
            <DistributionStrip
                values={dossier.finishedRuns.map((r) => r.timeMs)}
                markers={[
                    {
                        label: 'Tonight',
                        atMs: postRun.finalTimeMs,
                        tone: 'accent',
                    },
                ]}
                play={stage >= 2}
            />
            <Reveal when={stage >= 2}>
                <div className={styles.subStat}>
                    {dossier.runner.username} on therun.gg
                </div>
            </Reveal>
        </SlideShell>
    );
};
