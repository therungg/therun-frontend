'use client';

import React from 'react';
import { dangerSplit } from '~src/lib/fast50/compute';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { BigNumber, Reveal, RoadTrack, SlideShell } from '../deck/primitives';

export const SurvivedSlide: SlideComponent = ({
    dossier,
    evaluation,
    stage,
}) => {
    const { postRun } = dossier;
    if (!postRun) return null;
    const danger = dangerSplit(dossier.splits);
    if (!danger) return null;

    const surviveRate = Math.round((1 - danger.split.resetShare) * 100);

    return (
        <SlideShell
            kicker="Survived"
            headline={evaluation.headline}
            stage={stage}
        >
            <BigNumber
                value={surviveRate}
                play={stage >= 1}
                format={(n) => `${n}%`}
            />
            <Reveal when={stage >= 1}>
                <div className={styles.subStat}>
                    of runs make it past — tonight's did
                </div>
            </Reveal>
            <RoadTrack
                splits={dossier.splits}
                stage={stage}
                highlightIndex={danger.split.index}
                zoom
                tone="accent"
            />
        </SlideShell>
    );
};
