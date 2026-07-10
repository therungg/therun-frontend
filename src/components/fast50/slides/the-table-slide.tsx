'use client';

import React from 'react';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { BigNumber, Reveal, SlideShell } from '../deck/primitives';

export const TheTableSlide: SlideComponent = ({
    dossier,
    evaluation,
    stage,
}) => {
    const { postRun } = dossier;
    if (!postRun) return null;

    const contributors = postRun.splits.flatMap((s) => {
        const split = dossier.splits[s.index];
        if (s.singleMs === null || !split?.goldMs) return [];
        const lost = Math.max(0, s.singleMs - split.goldMs);
        return lost > 0 ? [{ name: s.name, lost }] : [];
    });
    if (contributors.length === 0) return null;

    const total = contributors.reduce((sum, c) => sum + c.lost, 0);
    const top3 = [...contributors].sort((a, b) => b.lost - a.lost).slice(0, 3);

    return (
        <SlideShell
            kicker="What could have been"
            headline={evaluation.headline}
            stage={stage}
        >
            <BigNumber value={total} play={stage >= 1} format={formatTimeMs} />
            <div className={styles.tableList}>
                {top3.map((c, i) => (
                    <Reveal
                        key={c.name}
                        when={stage >= 2}
                        delayMs={i * 130}
                        className={styles.tableRow}
                    >
                        {c.name} — {formatTimeMs(c.lost)}
                    </Reveal>
                ))}
            </div>
        </SlideShell>
    );
};
