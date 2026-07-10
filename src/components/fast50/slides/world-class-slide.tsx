'use client';

import React from 'react';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { PercentileBars, Reveal, SlideShell } from '../deck/primitives';

export const WorldClassSlide: SlideComponent = ({
    dossier,
    evaluation,
    stage,
}) => {
    const community = dossier.community;
    if (!community) return null;

    const best = community.segments
        .filter((s) => s.percentile !== null)
        .sort((a, b) => (a.percentile as number) - (b.percentile as number))
        .slice(0, 5)
        .map((s) => ({ label: s.name, percentile: s.percentile as number }));
    if (best.length === 0) return null;

    return (
        <SlideShell
            kicker="World class"
            headline={evaluation.headline}
            stage={stage}
        >
            <PercentileBars items={best} play={stage >= 1} />
            <Reveal when={stage >= 2}>
                <div className={styles.subStat}>
                    measured against {community.userCount} runners of this game
                    on therun.gg
                </div>
            </Reveal>
        </SlideShell>
    );
};
