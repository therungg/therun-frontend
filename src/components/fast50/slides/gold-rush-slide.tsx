'use client';

import React from 'react';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { BigNumber, Reveal, SlideShell } from '../deck/primitives';

export const GoldRushSlide: SlideComponent = ({
    dossier,
    evaluation,
    stage,
}) => {
    const { postRun } = dossier;
    if (!postRun) return null;
    const golds = postRun.splits.filter((s) => s.isGold);
    if (golds.length === 0) return null;
    const bonus = postRun.events.find((e) => e.type === 'best_run_ever_event');

    return (
        <SlideShell
            kicker="Gold rush"
            headline={evaluation.headline}
            stage={stage}
        >
            <BigNumber
                value={postRun.goldCount}
                play={stage >= 1}
                className={styles.heroGold}
            />
            <div className={styles.goldList}>
                {golds.map((s, i) => (
                    <Reveal
                        key={s.index}
                        when={stage >= 2}
                        delayMs={i * 130}
                        className={styles.goldItem}
                    >
                        {s.name} — {formatTimeMs(s.goldSaveMs)} faster than ever
                        before
                    </Reveal>
                ))}
                {bonus ? (
                    <Reveal
                        when={stage >= 2}
                        delayMs={golds.length * 130}
                        className={styles.goldBonus}
                    >
                        {bonus.description}
                    </Reveal>
                ) : null}
            </div>
        </SlideShell>
    );
};
