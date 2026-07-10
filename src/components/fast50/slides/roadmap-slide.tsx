'use client';

import React from 'react';
import { dangerSplit, roadmap } from '~src/lib/fast50/compute';
import type { SlideComponent } from '../deck/deck';
import { RoadTrack, SlideShell } from '../deck/primitives';

export const RoadmapSlide: SlideComponent = ({ dossier, stage }) => {
    const road = roadmap(dossier.splits);
    const danger = dangerSplit(dossier.splits);
    if (road.length === 0) return null;

    return (
        <SlideShell
            kicker="The road ahead"
            headline="Know the map"
            stage={stage}
        >
            <RoadTrack
                splits={dossier.splits}
                stage={stage}
                highlightIndex={danger?.split.index}
            />
        </SlideShell>
    );
};
