import { describe, expect, it } from 'vitest';
import type { VodMarker } from '../../../../../../types/leaderboards.types';
import {
    formatDeltaMs,
    formatFrameTime,
    formatMs,
    frameFromSeconds,
    removeMarkerAt,
    retimeMs,
    secondsFromFrame,
    setMarker,
} from './retime';

describe('frame <-> seconds', () => {
    it('round-trips at 30, 60 and 59.94', () => {
        for (const fps of [30, 60, 59.94]) {
            for (const frame of [0, 1, 17, 1000, 123456]) {
                expect(
                    frameFromSeconds(secondsFromFrame(frame, fps), fps),
                ).toBe(frame);
            }
        }
    });
    it('floors player time onto the frame it is inside', () => {
        expect(frameFromSeconds(0.0166, 60)).toBe(0);
        expect(frameFromSeconds(0.0167, 60)).toBe(1);
        expect(frameFromSeconds(1, 60)).toBe(60); // exact boundary, no float slop
    });
    it('seeks to the middle of a frame', () => {
        expect(secondsFromFrame(0, 60)).toBeCloseTo(0.5 / 60, 9);
    });
});

describe('retimeMs', () => {
    const start: VodMarker = { kind: 'start', frame: 600 };
    it('is null until both markers exist', () => {
        expect(retimeMs([start], 60)).toBeNull();
        expect(retimeMs([], 60)).toBeNull();
    });
    it('rounds to the millisecond', () => {
        expect(retimeMs([start, { kind: 'end', frame: 6600 }], 60)).toBe(
            100000,
        );
        expect(
            retimeMs(
                [
                    { kind: 'start', frame: 0 },
                    { kind: 'end', frame: 1 },
                ],
                30,
            ),
        ).toBe(33);
    });
});

describe('formatting', () => {
    it('formats frame time as h:mm:ss.mmm', () => {
        expect(formatFrameTime(0, 60)).toBe('0:00.000');
        expect(formatFrameTime(60 * 3661 + 30, 60)).toBe('1:01:01.500');
    });
    it('formats ms and deltas', () => {
        expect(formatMs(5025670)).toBe('1:23:45.670');
        expect(formatDeltaMs(50)).toBe('+0.050');
        expect(formatDeltaMs(-1234)).toBe('−1.234');
        expect(formatDeltaMs(0)).toBe('±0.000');
    });
});

describe('marker ops', () => {
    it('setMarker replaces an existing start/end but appends splits/notes, sorted', () => {
        let m = setMarker([], { kind: 'start', frame: 100 });
        m = setMarker(m, { kind: 'start', frame: 90 });
        m = setMarker(m, { kind: 'note', frame: 50, note: 'a' });
        m = setMarker(m, { kind: 'note', frame: 60, note: 'b' });
        expect(m).toEqual([
            { kind: 'note', frame: 50, note: 'a' },
            { kind: 'note', frame: 60, note: 'b' },
            { kind: 'start', frame: 90 },
        ]);
    });
    it('removeMarkerAt drops by index', () => {
        expect(
            removeMarkerAt(
                [
                    { kind: 'start', frame: 1 },
                    { kind: 'end', frame: 2 },
                ],
                0,
            ),
        ).toEqual([{ kind: 'end', frame: 2 }]);
    });
});
