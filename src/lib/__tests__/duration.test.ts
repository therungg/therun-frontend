import { describe, expect, test } from 'vitest';
import {
    formatDuration,
    formatDurationFull,
    parseDurationText,
} from '../duration';

describe('parseDurationText', () => {
    test('rejects empty', () => {
        expect(parseDurationText('')).toBeUndefined();
        expect(parseDurationText('   ')).toBeUndefined();
    });

    test('rejects negatives', () => {
        expect(parseDurationText('-5')).toBeUndefined();
        expect(parseDurationText('1:-5')).toBeUndefined();
        expect(parseDurationText('-1:23:45')).toBeUndefined();
    });

    test('rejects non-numeric garbage', () => {
        expect(parseDurationText('abc')).toBeUndefined();
        expect(parseDurationText('12:ab')).toBeUndefined();
    });

    test('rejects out-of-range components where a higher unit exists', () => {
        expect(parseDurationText('1:75:00')).toBeUndefined(); // mm >= 60, h present
        expect(parseDurationText('23:75')).toBeUndefined(); // ss >= 60, mm present
        expect(parseDurationText('1h75m45s')).toBeUndefined(); // mm >= 60, h present
        expect(parseDurationText('23m75s')).toBeUndefined(); // ss >= 60, mm present
    });

    test('bare number is seconds, never minutes', () => {
        expect(parseDurationText('95')).toBe(95_000);
        expect(parseDurationText('45.678')).toBe(45_678);
        expect(parseDurationText('150')).toBe(150_000); // no higher unit, no cap
    });

    test('h:mm:ss.mmm keeps milliseconds', () => {
        expect(parseDurationText('1:23:45.678')).toBe(5_025_678);
    });

    test('mm:ss.mmm keeps milliseconds', () => {
        expect(parseDurationText('9:05.000')).toBe(545_000);
        expect(parseDurationText('23:45.5')).toBe(23 * 60_000 + 45_500);
    });

    test('ss.mmm (single segment with fraction) is seconds', () => {
        expect(parseDurationText('45.6')).toBe(45_600);
    });

    test('same shapes without the fraction', () => {
        expect(parseDurationText('1:23:45')).toBe(
            (1 * 3600 + 23 * 60 + 45) * 1000,
        );
        expect(parseDurationText('12:30')).toBe((12 * 60 + 30) * 1000);
    });

    test('fractions of 1-3 digits scale correctly', () => {
        expect(parseDurationText('45.6')).toBe(45_600);
        expect(parseDurationText('45.67')).toBe(45_670);
        expect(parseDurationText('45.678')).toBe(45_678);
    });

    test('milliseconds are never truncated', () => {
        expect(parseDurationText('1:23:45.678')).not.toBe(5_025_000);
    });

    test('courtesy shape: h m s', () => {
        expect(parseDurationText('1h23m45s')).toBe(5_025_000);
    });

    test('courtesy shape: m s', () => {
        expect(parseDurationText('23m45s')).toBe((23 * 60 + 45) * 1000);
    });

    test('courtesy shape: s only', () => {
        expect(parseDurationText('45s')).toBe(45_000);
    });

    test('courtesy shape is case-insensitive', () => {
        expect(parseDurationText('1H23M45S')).toBe(5_025_000);
    });

    test('courtesy shape allows optional .mmm on the seconds part', () => {
        expect(parseDurationText('1h23m45.5s')).toBe(5_025_500);
        expect(parseDurationText('45.678s')).toBe(45_678);
    });
});

describe('formatDuration', () => {
    test('full precision with hours', () => {
        expect(formatDuration(5_025_678)).toBe('1:23:45.678');
    });

    test('drops the fraction only when ms is exactly zero', () => {
        expect(formatDuration(545_000)).toBe('9:05');
    });

    test('shows a 3-digit fraction otherwise', () => {
        expect(formatDuration(545_678)).toBe('9:05.678');
    });

    test('sub-minute with ms', () => {
        expect(formatDuration(45_678)).toBe('0:45.678');
    });

    test('sub-minute without ms', () => {
        expect(formatDuration(45_000)).toBe('0:45');
    });

    test('zero-pads inner units', () => {
        expect(formatDuration(3_600_000 + 5_000 + 6)).toBe('1:00:05.006');
    });
});

// Absorbed from the deleted `time-input.ts` suite. These shapes came from the
// presenter target-time parser, where a bare number meant MINUTES; every other
// shape it accepted still parses, and identically.
describe('shapes inherited from the old parsers', () => {
    test('mm:ss', () => {
        expect(parseDurationText('12:30')).toBe((12 * 60 + 30) * 1000);
    });

    test('h:mm:ss', () => {
        expect(parseDurationText('1:40:00')).toBe((1 * 3600 + 40 * 60) * 1000);
    });

    test('a trailing .0 is a zero fraction, not garbage', () => {
        expect(parseDurationText('1:40:00.0')).toBe(
            (1 * 3600 + 40 * 60) * 1000,
        );
    });

    // The old moderation parser wrapped `timeToMillis`, which read `.5` as 5ms
    // because it never padded the fraction. Tenths now mean tenths.
    test('tenths are 100ms each, not 1ms each', () => {
        expect(parseDurationText('1:30.5')).toBe(90_500);
        expect(parseDurationText('1:30.05')).toBe(90_050);
        expect(parseDurationText('1:30.005')).toBe(90_005);
    });

    test('formatDuration round-trips through parseDurationText', () => {
        const ms = (2 * 3600 + 5 * 60 + 9) * 1000;
        expect(parseDurationText(formatDuration(ms))).toBe(ms);
    });
});

describe('formatDurationFull', () => {
    test('always h:mm:ss.mmm, never eliding a unit', () => {
        expect(formatDurationFull(4_000)).toBe('0:00:04.000');
        expect(formatDurationFull(95_000)).toBe('0:01:35.000');
        expect(formatDurationFull(2_148_600)).toBe('0:35:48.600');
        expect(formatDurationFull(5_025_678)).toBe('1:23:45.678');
    });

    test('clamps negatives rather than rendering a minus', () => {
        expect(formatDurationFull(-1)).toBe('0:00:00.000');
    });
});
