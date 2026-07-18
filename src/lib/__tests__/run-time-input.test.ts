import { describe, expect, test } from 'vitest';
import { formatRunTimeEcho, parseRunTimeInput } from '../run-time-input';

describe('parseRunTimeInput', () => {
    test('rejects empty', () => {
        expect(parseRunTimeInput('')).toBeUndefined();
        expect(parseRunTimeInput('   ')).toBeUndefined();
    });

    test('rejects negatives', () => {
        expect(parseRunTimeInput('-5')).toBeUndefined();
        expect(parseRunTimeInput('1:-5')).toBeUndefined();
        expect(parseRunTimeInput('-1:23:45')).toBeUndefined();
    });

    test('rejects non-numeric garbage', () => {
        expect(parseRunTimeInput('abc')).toBeUndefined();
        expect(parseRunTimeInput('12:ab')).toBeUndefined();
    });

    test('rejects out-of-range components where a higher unit exists', () => {
        expect(parseRunTimeInput('1:75:00')).toBeUndefined(); // mm >= 60, h present
        expect(parseRunTimeInput('23:75')).toBeUndefined(); // ss >= 60, mm present
        expect(parseRunTimeInput('1h75m45s')).toBeUndefined(); // mm >= 60, h present
        expect(parseRunTimeInput('23m75s')).toBeUndefined(); // ss >= 60, mm present
    });

    test('bare number is seconds, never minutes', () => {
        expect(parseRunTimeInput('95')).toBe(95_000);
        expect(parseRunTimeInput('45.678')).toBe(45_678);
        expect(parseRunTimeInput('150')).toBe(150_000); // no higher unit, no cap
    });

    test('h:mm:ss.mmm keeps milliseconds', () => {
        expect(parseRunTimeInput('1:23:45.678')).toBe(5_025_678);
    });

    test('mm:ss.mmm keeps milliseconds', () => {
        expect(parseRunTimeInput('9:05.000')).toBe(545_000);
        expect(parseRunTimeInput('23:45.5')).toBe(23 * 60_000 + 45_500);
    });

    test('ss.mmm (single segment with fraction) is seconds', () => {
        expect(parseRunTimeInput('45.6')).toBe(45_600);
    });

    test('same shapes without the fraction', () => {
        expect(parseRunTimeInput('1:23:45')).toBe(
            (1 * 3600 + 23 * 60 + 45) * 1000,
        );
        expect(parseRunTimeInput('12:30')).toBe((12 * 60 + 30) * 1000);
    });

    test('fractions of 1-3 digits scale correctly', () => {
        expect(parseRunTimeInput('45.6')).toBe(45_600);
        expect(parseRunTimeInput('45.67')).toBe(45_670);
        expect(parseRunTimeInput('45.678')).toBe(45_678);
    });

    test('milliseconds are never truncated', () => {
        expect(parseRunTimeInput('1:23:45.678')).not.toBe(5_025_000);
    });

    test('courtesy shape: h m s', () => {
        expect(parseRunTimeInput('1h23m45s')).toBe(5_025_000);
    });

    test('courtesy shape: m s', () => {
        expect(parseRunTimeInput('23m45s')).toBe((23 * 60 + 45) * 1000);
    });

    test('courtesy shape: s only', () => {
        expect(parseRunTimeInput('45s')).toBe(45_000);
    });

    test('courtesy shape is case-insensitive', () => {
        expect(parseRunTimeInput('1H23M45S')).toBe(5_025_000);
    });

    test('courtesy shape allows optional .mmm on the seconds part', () => {
        expect(parseRunTimeInput('1h23m45.5s')).toBe(5_025_500);
        expect(parseRunTimeInput('45.678s')).toBe(45_678);
    });
});

describe('formatRunTimeEcho', () => {
    test('full precision with hours', () => {
        expect(formatRunTimeEcho(5_025_678)).toBe('1:23:45.678');
    });

    test('drops the fraction only when ms is exactly zero', () => {
        expect(formatRunTimeEcho(545_000)).toBe('9:05');
    });

    test('shows a 3-digit fraction otherwise', () => {
        expect(formatRunTimeEcho(545_678)).toBe('9:05.678');
    });

    test('sub-minute with ms', () => {
        expect(formatRunTimeEcho(45_678)).toBe('0:45.678');
    });

    test('sub-minute without ms', () => {
        expect(formatRunTimeEcho(45_000)).toBe('0:45');
    });

    test('zero-pads inner units', () => {
        expect(formatRunTimeEcho(3_600_000 + 5_000 + 6)).toBe('1:00:05.006');
    });
});
