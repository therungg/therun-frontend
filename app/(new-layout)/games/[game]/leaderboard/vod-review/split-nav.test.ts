import { describe, expect, it } from 'vitest';
import type {
    RunSplit,
    VodMarker,
} from '../../../../../../types/leaderboards.types';
import {
    nextSplitPos,
    prevSplitPos,
    splitTargetFrame,
    startFrameOf,
} from './split-nav';

const split = (index: number, splitTimeMs: number): RunSplit => ({
    index,
    name: `Segment ${index + 1}`,
    splitTimeMs,
    gameSplitTimeMs: null,
    segmentCount: 3,
});

// At 60fps: 1000ms = 60 frames. Start pinned at frame 100.
const splits = [split(0, 1000), split(1, 2500), split(2, 4200)];

describe('startFrameOf', () => {
    it('returns the start marker frame', () => {
        const markers: VodMarker[] = [
            { kind: 'start', frame: 100 },
            { kind: 'end', frame: 400 },
        ];
        expect(startFrameOf(markers)).toBe(100);
    });

    it('returns null when there is no start marker', () => {
        expect(startFrameOf([{ kind: 'end', frame: 400 }])).toBeNull();
    });
});

describe('splitTargetFrame', () => {
    it('anchors cumulative real time onto the timeline', () => {
        expect(splitTargetFrame(100, 1000, 60)).toBe(160); // 100 + 60
        expect(splitTargetFrame(100, 2500, 60)).toBe(250); // 100 + 150
    });
});

describe('nextSplitPos', () => {
    it('returns the first split after the cursor', () => {
        // cursor at 200 → split 0 (160) is behind, split 1 (250) is next.
        expect(nextSplitPos(splits, 100, 60, 200)).toBe(1);
    });

    it('returns split 0 when the cursor is before every split', () => {
        expect(nextSplitPos(splits, 100, 60, 100)).toBe(0);
    });

    it('returns null when the cursor is at/after the last split', () => {
        expect(nextSplitPos(splits, 100, 60, 352)).toBeNull(); // last = 352
    });
});

describe('prevSplitPos', () => {
    it('returns the last split before the cursor', () => {
        // cursor at 260 → split 1 (250) is the last one behind it.
        expect(prevSplitPos(splits, 100, 60, 260)).toBe(1);
    });

    it('returns null when the cursor is at/before the first split', () => {
        expect(prevSplitPos(splits, 100, 60, 160)).toBeNull(); // first = 160
    });

    it('returns the last split when the cursor is past the finish', () => {
        expect(prevSplitPos(splits, 100, 60, 999)).toBe(2);
    });
});
