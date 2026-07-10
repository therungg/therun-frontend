'use client';

import React from 'react';
import { runPercentile, runRank } from '~src/lib/fast50/compute';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { DistributionStrip, Reveal, SlideShell } from '../deck/primitives';

export const WhereItLandsSlide: SlideComponent = ({
    dossier,
    evaluation,
    stage,
}) => {
    const { postRun } = dossier;
    if (!postRun) return null;

    const pctl = runPercentile(dossier.finishedRuns, postRun.finalTimeMs);
    if (pctl === null) return null;
    const rank = runRank(dossier.finishedRuns, postRun.finalTimeMs);
    const top = Math.max(100 - pctl, 1);

    return (
        <SlideShell
            kicker="Where it lands"
            headline={evaluation.headline}
            stage={stage}
        >
            <DistributionStrip
                values={dossier.finishedRuns.map((r) => r.timeMs)}
                markers={[
                    {
                        label: 'Tonight',
                        atMs: postRun.finalTimeMs,
                        tone: 'accent',
                    },
                ]}
                play={stage >= 1}
            />
            <Reveal when={stage >= 2}>
                <div className={styles.subStat}>
                    #{rank} of {dossier.finishedRuns.length} finished runs — top{' '}
                    {top}%
                </div>
            </Reveal>
        </SlideShell>
    );
};
