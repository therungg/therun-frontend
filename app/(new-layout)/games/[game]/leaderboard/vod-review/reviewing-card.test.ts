import { describe, expect, it } from 'vitest';
import { reviewingSummary } from './reviewing-card';

describe('reviewingSummary', () => {
    it('says so when nothing is marked yet', () => {
        expect(reviewingSummary(null)).toBe('Nothing marked yet');
        expect(reviewingSummary({ fps: 60, markers: [] })).toBe(
            'Nothing marked yet',
        );
    });
    it('shows start/end as times at the patch fps, plus the retime', () => {
        expect(
            reviewingSummary({
                fps: 60,
                markers: [
                    { kind: 'start', frame: 68 }, // 1.133s
                    { kind: 'end', frame: 177_904 }, // 49:25.067
                ],
                retimedMs: 2_963_933,
            }),
        ).toBe('start 0:01.133 · end 49:25.067 · retime 49:23.933');
    });
    it('omits what is not there yet', () => {
        expect(
            reviewingSummary({
                fps: 30,
                markers: [{ kind: 'start', frame: 30 }],
            }),
        ).toBe('start 0:01.000');
    });
});
