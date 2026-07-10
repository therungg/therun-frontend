'use client';

import React from 'react';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import { forecastBands } from '~src/lib/fast50/compute';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { DistributionStrip, Reveal, SlideShell } from '../deck/primitives';

export const ForecastSlide: SlideComponent = ({
    dossier,
    evaluation,
    stage,
}) => {
    const bands = forecastBands(dossier.finishedRuns);
    if (!bands) return null;
    const markers = [
        ...(dossier.core.pbMs
            ? [{ label: 'PB', atMs: dossier.core.pbMs, tone: 'gold' as const }]
            : []),
        ...(dossier.core.sobMs
            ? [
                  {
                      label: 'Sum of bests',
                      atMs: dossier.core.sobMs,
                      tone: 'muted' as const,
                  },
              ]
            : []),
    ];
    return (
        <SlideShell
            kicker="Tonight's forecast"
            headline={evaluation.headline}
            stage={stage}
        >
            <DistributionStrip
                values={dossier.finishedRuns.slice(-20).map((r) => r.timeMs)}
                bands={{ p10: bands.p10Ms, p50: bands.p50Ms, p90: bands.p90Ms }}
                markers={markers}
                play={stage >= 1}
            />
            <Reveal when={stage >= 2}>
                <div className={styles.subStat}>
                    based on the last {bands.sample} finished runs — typical
                    finish {formatTimeMs(bands.p50Ms)}
                </div>
            </Reveal>
        </SlideShell>
    );
};
