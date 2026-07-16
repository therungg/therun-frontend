import { describe, expect, it } from 'vitest';
import { relativeDate } from './relative-date';

const NOW = new Date('2026-07-16T12:00:00Z');

describe('relativeDate', () => {
    it('same day is today', () => {
        expect(relativeDate('2026-07-16T08:00:00Z', NOW)).toBe('today');
    });
    it('one day back is yesterday', () => {
        expect(relativeDate('2026-07-15T08:00:00Z', NOW)).toBe('yesterday');
    });
    it('days under a month', () => {
        expect(relativeDate('2026-07-02T08:00:00Z', NOW)).toBe('14 days ago');
    });
    it('months under a year', () => {
        expect(relativeDate('2026-02-16T08:00:00Z', NOW)).toBe('5 mo ago');
    });
    it('years', () => {
        expect(relativeDate('2024-05-16T08:00:00Z', NOW)).toBe('2 yr ago');
    });
    it('date-only strings work', () => {
        expect(relativeDate('2026-07-15', NOW)).toBe('yesterday');
    });
    it('future or invalid dates fall back to today/empty', () => {
        expect(relativeDate('2026-07-17T08:00:00Z', NOW)).toBe('today');
        expect(relativeDate('not-a-date', NOW)).toBe('');
    });
});
