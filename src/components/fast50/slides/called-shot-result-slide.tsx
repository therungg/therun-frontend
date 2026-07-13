'use client';

import React from 'react';
import { formatDelta } from '~src/components/live/commentary-drawer/format';
import { calledShotVerdict, type VerdictKind } from '~src/lib/fast50/verdict';
import type { CustomSlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { Reveal, TimeText } from '../deck/primitives';

const VERDICT_COPY: Record<Exclude<VerdictKind, 'no-target'>, string> = {
    demolished: 'DEMOLISHED',
    hit: 'HIT',
    missed: 'MISSED',
    died: 'THE RUN HAD OTHER PLANS',
};

export const CalledShotResultSlide: CustomSlideComponent = ({
    dossier,
    content,
    stage,
}) => {
    if (content.kind !== 'called-shot-result') return null;
    const { goal } = content;
    const verdict = calledShotVerdict(goal, dossier.postRun);
    return (
        <div className={styles.slide}>
            <div className={styles.slideContent}>
                <div className={styles.kicker}>He called it: {goal.text}</div>
                {dossier.postRun ? (
                    <Reveal when={stage >= 1}>
                        <div className={styles.hero}>
                            <TimeText ms={dossier.postRun.finalTimeMs} />
                        </div>
                    </Reveal>
                ) : null}
                <Reveal when={stage >= 2}>
                    {verdict.kind !== 'no-target' ? (
                        <div
                            className={styles.verdictStamp}
                            data-kind={verdict.kind}
                        >
                            {VERDICT_COPY[verdict.kind]}
                            {verdict.deltaMs !== null ? (
                                <span className={styles.verdictDelta}>
                                    {formatDelta(verdict.deltaMs).text} vs the
                                    call
                                </span>
                            ) : null}
                        </div>
                    ) : (
                        <div />
                    )}
                </Reveal>
            </div>
        </div>
    );
};
