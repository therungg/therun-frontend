import { describe, expect, it } from 'vitest';
import type {
    RunSplit,
    VodMarker,
} from '../../../../../../types/leaderboards.types';
import {
    nextSplitPos,
    prevSplitPos,
    splitStartFrame,
    splitStartMs,
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

describe('splitStartMs', () => {
    it('starts the first segment with the run', () => {
        expect(splitStartMs(splits, 0)).toBe(0);
    });

    it('starts a segment on the split that ended the one before', () => {
        expect(splitStartMs(splits, 1)).toBe(1000);
        expect(splitStartMs(splits, 2)).toBe(2500);
    });
});

// Segment start frames: 100 (run start), 160, 250.
describe('nextSplitPos', () => {
    it('returns the first segment starting after the cursor', () => {
        // cursor at 200 → segments 0 (100) and 1 (160) are behind it.
        expect(nextSplitPos(splits, 100, 60, 200)).toBe(2);
    });

    it('returns segment 0 when the cursor is before the run start', () => {
        expect(nextSplitPos(splits, 100, 60, 99)).toBe(0);
    });

    it('returns null when the cursor is inside the last segment', () => {
        expect(nextSplitPos(splits, 100, 60, 352)).toBeNull();
    });
});

describe('prevSplitPos', () => {
    it('returns the last segment starting before the cursor', () => {
        expect(prevSplitPos(splits, 100, 60, 260)).toBe(2);
        expect(prevSplitPos(splits, 100, 60, 200)).toBe(1);
    });

    it('returns null when the cursor is at/before the run start', () => {
        expect(prevSplitPos(splits, 100, 60, 100)).toBeNull();
    });

    it('returns the last segment when the cursor is past the finish', () => {
        expect(prevSplitPos(splits, 100, 60, 999)).toBe(2);
    });
});

describe('splitStartFrame', () => {
    it('anchors a segment start onto the timeline', () => {
        expect(splitStartFrame(splits, 0, 100, 60)).toBe(100);
        expect(splitStartFrame(splits, 2, 100, 60)).toBe(250);
    });
});
