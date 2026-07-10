'use client';

import React from 'react';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import { dangerSplit, roadmap } from '~src/lib/fast50/compute';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { SlideShell } from '../deck/primitives';

const W = 1600;
const TRACK_Y = 120;

export const RoadmapSlide: SlideComponent = ({ dossier, stage }) => {
    const road = roadmap(dossier.splits);
    const danger = dangerSplit(dossier.splits);
    if (road.length === 0) return null;
    const totalMs = road[road.length - 1].atMs;

    // Cap visible landmarks at 8: always keep first, last, danger.
    const keep = new Set<number>([road[0].index, road[road.length - 1].index]);
    if (danger) keep.add(danger.split.index);
    const rest = road.filter((r) => !keep.has(r.index));
    const step = Math.ceil(rest.length / Math.max(1, 8 - keep.size));
    const visible = road.filter((r, i) => keep.has(r.index) || i % step === 0);

    return (
        <SlideShell
            kicker="The road ahead"
            headline="Know the map"
            stage={stage}
        >
            <svg
                viewBox={`0 0 ${W} 300`}
                className={styles.roadmapSvg}
                role="img"
                aria-label="Run roadmap"
            >
                <line
                    x1={40}
                    y1={TRACK_Y}
                    x2={W - 40}
                    y2={TRACK_Y}
                    className={styles.roadTrack}
                    data-drawn={stage >= 1 || undefined}
                />
                {visible.map((r, i) => {
                    const x = 40 + (r.atMs / totalMs) * (W - 80);
                    const isDanger = danger?.split.index === r.index;
                    return (
                        <g
                            key={r.index}
                            className={styles.roadNode}
                            data-visible={stage >= 2 || undefined}
                            data-danger={isDanger || undefined}
                            style={{ transitionDelay: `${i * 90}ms` }}
                        >
                            <circle cx={x} cy={TRACK_Y} r={isDanger ? 14 : 9} />
                            <text x={x} y={TRACK_Y + 52} textAnchor="middle">
                                {r.name}
                            </text>
                            <text
                                x={x}
                                y={TRACK_Y + 88}
                                textAnchor="middle"
                                className={styles.roadClock}
                            >
                                {formatTimeMs(r.atMs)}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </SlideShell>
    );
};
