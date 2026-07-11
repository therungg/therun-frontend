'use client';

import React from 'react';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { BigNumber, Reveal, SlideShell } from '../deck/primitives';

// `formatTimeMs` truncates to whole seconds, so a genuine (positive) gold
// save under a second reads as "0:00 faster than ever before" — confirmed
// via live curl (ERoadhouse's LEGO Star Wars Any%, a sub-second Jundland
// Wastes gold). Saves are always positive here, so show tenths under a
// minute instead of borrowing the clock formatter.
const formatSave = (ms: number): string => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    if (minutes > 0) return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const tenths = Math.floor((totalSeconds * 10) % 10);
    return `${seconds}.${tenths}s`;
};

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
                        {s.name} —{' '}
                        {s.goldSaveMs !== null ? formatSave(s.goldSaveMs) : '—'}{' '}
                        faster than ever before
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
