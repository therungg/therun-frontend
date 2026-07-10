'use client';

import React from 'react';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { BigNumber, Reveal, SlideShell } from '../deck/primitives';

export const OneShotSlide: SlideComponent = ({
    dossier,
    evaluation,
    stage,
}) => {
    const diePct = Math.round((1 - dossier.core.finishRate) * 100);
    return (
        <SlideShell
            kicker="One shot"
            headline={evaluation.headline}
            stage={stage}
        >
            <BigNumber
                value={diePct}
                play={stage >= 1}
                format={(n) => `${n}%`}
            />
            <Reveal when={stage >= 2}>
                <div className={styles.subStat}>
                    of attempts never see the credits — tonight there are no
                    retries
                </div>
            </Reveal>
        </SlideShell>
    );
};
