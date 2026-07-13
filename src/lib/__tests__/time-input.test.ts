import { describe, expect, test } from 'vitest';
import { parseTimeInput } from '../time-input';

describe('parseTimeInput', () => {
    test('empty / garbage → undefined', () => {
        expect(parseTimeInput('')).toBeUndefined();
        expect(parseTimeInput('abc')).toBeUndefined();
        expect(parseTimeInput('1:-5')).toBeUndefined();
    });
    test('single number is minutes', () => {
        expect(parseTimeInput('95')).toBe(95 * 60_000);
    });
    test('two parts is mm:ss', () => {
        expect(parseTimeInput('12:30')).toBe((12 * 60 + 30) * 1000);
    });
    test('three parts is h:mm:ss', () => {
        expect(parseTimeInput('1:40:00')).toBe((1 * 3600 + 40 * 60) * 1000);
    });
    test('tolerates formatTimeMs decimals', () => {
        expect(parseTimeInput('1:40:00.0')).toBe((1 * 3600 + 40 * 60) * 1000);
    });
});
