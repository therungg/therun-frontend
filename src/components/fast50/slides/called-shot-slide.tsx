'use client';

import React from 'react';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import type { CustomSlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { Reveal, TimeText } from '../deck/primitives';

export const CalledShotSlide: CustomSlideComponent = ({
    dossier,
    content,
    stage,
}) => {
    if (content.kind !== 'called-shot') return null;
    const { goal } = content;
    const target = goal.targetTimeMs;
    const recent = dossier.finishedRuns.slice(-50);
    const under = target ? recent.filter((r) => r.timeMs <= target).length : 0;
    return (
        <div className={styles.slide}>
            <div className={styles.slideContent}>
                <div className={styles.kicker}>The called shot</div>
                <Reveal when={stage >= 0}>
                    <h1 className={styles.headline}>{goal.text}</h1>
                </Reveal>
                {target ? (
                    <>
                        <Reveal when={stage >= 1}>
                            <div className={styles.hero}>
                                <TimeText ms={target} />
                            </div>
                        </Reveal>
                        <Reveal when={stage >= 2}>
                            <div className={styles.subStat}>
                                {recent.length > 0
                                    ? `beaten ${formatTimeMs(target)} in ${under} of the last ${recent.length} finishes`
                                    : 'no finished runs on record — full send'}
                            </div>
                        </Reveal>
                    </>
                ) : null}
            </div>
        </div>
    );
};
