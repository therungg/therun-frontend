'use client';

import React from 'react';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import { dangerSplit } from '~src/lib/fast50/compute';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { BigNumber, Reveal, RoadTrack, SlideShell } from '../deck/primitives';

export const DangerZoneSlide: SlideComponent = ({
    dossier,
    evaluation,
    stage,
}) => {
    const danger = dangerSplit(dossier.splits);
    if (!danger) return null;

    return (
        <SlideShell
            kicker="Danger zone"
            headline={evaluation.headline}
            stage={stage}
            danger
        >
            <BigNumber
                value={Math.round(danger.split.resetShare * 100)}
                play={stage >= 1}
                format={(n) => `${n}%`}
            />
            <Reveal when={stage >= 1}>
                <div className={styles.subStat}>of all resets happen here</div>
            </Reveal>
            <RoadTrack
                splits={dossier.splits}
                stage={stage}
                highlightIndex={danger.split.index}
                zoom
            />
            <Reveal when={stage >= 2}>
                <div className={styles.watchCue}>
                    Watch for it around {formatTimeMs(danger.startsAtMs)}
                    {danger.afterName
                        ? `, right after ${danger.afterName}`
                        : ''}
                    . Still alive after {danger.split.name}? Start believing.
                </div>
            </Reveal>
        </SlideShell>
    );
};
