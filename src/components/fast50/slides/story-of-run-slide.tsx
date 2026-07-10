'use client';

import React from 'react';
import type { PostRunSplit } from '~src/lib/fast50/dossier.types';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { DeltaBars, Reveal, SlideShell } from '../deck/primitives';

const MAX_ITEMS = 12;

// If there are more than MAX_ITEMS splits with a delta, keep the ones with
// the largest |deltaMs| — always keeping golds regardless of magnitude.
const selectItems = (withDeltas: PostRunSplit[]): PostRunSplit[] => {
    if (withDeltas.length <= MAX_ITEMS) return withDeltas;
    const golds = withDeltas.filter((s) => s.isGold);
    const nonGolds = withDeltas
        .filter((s) => !s.isGold)
        .sort(
            (a, b) =>
                Math.abs(b.deltaVsAvgMs as number) -
                Math.abs(a.deltaVsAvgMs as number),
        );
    const remaining = Math.max(0, MAX_ITEMS - golds.length);
    const keep = new Set([
        ...golds.map((s) => s.index),
        ...nonGolds.slice(0, remaining).map((s) => s.index),
    ]);
    return withDeltas
        .filter((s) => keep.has(s.index))
        .sort((a, b) => a.index - b.index);
};

export const StoryOfRunSlide: SlideComponent = ({
    dossier,
    evaluation,
    stage,
}) => {
    const { postRun } = dossier;
    if (!postRun) return null;
    const withDeltas = postRun.splits.filter((s) => s.deltaVsAvgMs !== null);
    if (withDeltas.length === 0) return null;

    const items = selectItems(withDeltas).map((s) => ({
        label: s.name,
        deltaMs: s.deltaVsAvgMs as number,
        gold: s.isGold,
    }));

    const maxSave = withDeltas.reduce((a, b) =>
        (b.deltaVsAvgMs as number) < (a.deltaVsAvgMs as number) ? b : a,
    );
    const maxLoss = withDeltas.reduce((a, b) =>
        (b.deltaVsAvgMs as number) > (a.deltaVsAvgMs as number) ? b : a,
    );

    return (
        <SlideShell
            kicker="Story of the run"
            headline={evaluation.headline}
            stage={stage}
        >
            <DeltaBars items={items} play={stage >= 1} />
            <Reveal when={stage >= 2}>
                <div className={styles.subStat}>
                    Won at {maxSave.name}, nearly died at {maxLoss.name}
                </div>
            </Reveal>
        </SlideShell>
    );
};
