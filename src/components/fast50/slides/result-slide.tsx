'use client';

import React from 'react';
import {
    formatDelta,
    formatTimeMs,
} from '~src/components/live/commentary-drawer/format';
import { forecastBands } from '~src/lib/fast50/compute';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { BigNumber, Reveal, SlideShell } from '../deck/primitives';

export const ResultSlide: SlideComponent = ({ dossier, stage }) => {
    const { postRun } = dossier;
    if (!postRun) return null;

    const bands = forecastBands(dossier.finishedRuns);
    const delta = bands ? formatDelta(postRun.finalTimeMs - bands.p50Ms) : null;
    const isNewPb = postRun.finalTimeMs < (dossier.core.pbMs ?? Infinity);

    return (
        <SlideShell
            kicker="Final time"
            headline={dossier.runner.username}
            stage={stage}
        >
            <BigNumber
                value={postRun.finalTimeMs}
                play={stage >= 1}
                format={formatTimeMs}
            />
            {delta ? (
                <Reveal when={stage >= 2}>
                    <div className={styles.deltaLine} data-tone={delta.tone}>
                        <span className={styles.deltaValue}>{delta.text}</span>
                        <span className={styles.deltaLabel}>
                            vs typical run
                        </span>
                    </div>
                </Reveal>
            ) : null}
            {isNewPb ? (
                <Reveal when={stage >= 1} className={styles.pbBadge}>
                    <span>NEW PB</span>
                </Reveal>
            ) : null}
        </SlideShell>
    );
};
