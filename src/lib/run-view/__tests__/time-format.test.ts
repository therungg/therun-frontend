import { describe, expect, test } from 'vitest';
import { formatTimeMs } from '../time-format';

describe('formatTimeMs', () => {
    test('hours', () =>
        expect(formatTimeMs(3600000 + 23 * 60000 + 45000)).toBe('1:23:45'));
    test('minutes', () =>
        expect(formatTimeMs(23 * 60000 + 45000)).toBe('23:45'));
    test('sub-minute keeps ms', () =>
        expect(formatTimeMs(59678)).toBe('0:59.678'));
    test('zero-pads inner units', () =>
        expect(formatTimeMs(3600000 + 5000)).toBe('1:00:05'));
});
