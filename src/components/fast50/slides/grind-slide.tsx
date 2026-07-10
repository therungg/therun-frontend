'use client';

import React from 'react';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { BigNumber, Reveal, SlideShell } from '../deck/primitives';

export const GrindSlide: SlideComponent = ({ dossier, evaluation, stage }) => {
    const hours = dossier.core.categoryPlaytimeMs
        ? Math.round(dossier.core.categoryPlaytimeMs / 3600_000)
        : null;
    return (
        <SlideShell
            kicker="The grind"
            headline={evaluation.headline}
            stage={stage}
        >
            <BigNumber value={dossier.core.attemptCount} play={stage >= 1} />
            <Reveal when={stage >= 2}>
                <div className={styles.subStat}>
                    {hours !== null
                        ? `${hours.toLocaleString()} hours in this category alone`
                        : 'attempts and counting'}
                </div>
            </Reveal>
        </SlideShell>
    );
};
