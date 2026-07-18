import { afterEach, describe, expect, it } from 'vitest';
import { formatRunDate } from '../format-run-date';

const ORIGINAL_TZ = process.env.TZ;

describe('formatRunDate', () => {
    afterEach(() => {
        process.env.TZ = ORIGINAL_TZ;
    });

    describe('date-only input (bare YYYY-MM-DD)', () => {
        it('renders the typed date in a timezone west of UTC', () => {
            process.env.TZ = 'America/Los_Angeles';
            expect(formatRunDate('2026-07-18')).toBe(
                new Date('2026-07-18T12:00:00Z').toLocaleDateString(undefined, {
                    timeZone: 'UTC',
                }),
            );
        });

        it('renders the typed date in a timezone east of UTC', () => {
            process.env.TZ = 'Pacific/Kiritimati';
            expect(formatRunDate('2026-07-18')).toBe(
                new Date('2026-07-18T12:00:00Z').toLocaleDateString(undefined, {
                    timeZone: 'UTC',
                }),
            );
        });
    });

    describe('UTC-midnight timestamp (date-only value round-tripped through the API)', () => {
        it('does not shift a day earlier west of UTC (the off-by-one bug)', () => {
            process.env.TZ = 'America/Los_Angeles';
            // Regression check: plain toLocaleDateString() renders this as
            // July 17 in this timezone — proving the bug exists if unguarded.
            expect(
                new Date('2026-07-18T00:00:00.000Z').toLocaleDateString(),
            ).toBe('7/17/2026');

            expect(formatRunDate('2026-07-18T00:00:00.000Z')).toBe('7/18/2026');
        });

        it('handles the no-milliseconds Z form', () => {
            process.env.TZ = 'America/Los_Angeles';
            expect(formatRunDate('2026-07-18T00:00:00Z')).toBe('7/18/2026');
        });

        it('renders correctly east of UTC too', () => {
            process.env.TZ = 'Pacific/Kiritimati';
            expect(formatRunDate('2026-07-18T00:00:00.000Z')).toBe('7/18/2026');
        });
    });

    describe('true timestamps (real time-of-day component)', () => {
        it('falls back to plain toLocaleDateString(), local-time rendering', () => {
            process.env.TZ = 'America/Los_Angeles';
            const iso = '2026-07-18T14:30:00.000Z';
            expect(formatRunDate(iso)).toBe(new Date(iso).toLocaleDateString());
            // Sanity: this genuinely differs from the UTC-forced rendering,
            // confirming we did NOT force UTC for a true timestamp.
            expect(formatRunDate(iso)).toBe('7/18/2026');
        });

        it('a true timestamp that crosses to the previous local day is left as-is', () => {
            process.env.TZ = 'America/Los_Angeles';
            const iso = '2026-07-18T02:00:00.000Z';
            expect(formatRunDate(iso)).toBe(new Date(iso).toLocaleDateString());
            expect(formatRunDate(iso)).toBe('7/17/2026');
        });
    });

    describe('invalid input', () => {
        it('returns an empty string for garbage input rather than "Invalid Date"', () => {
            expect(formatRunDate('not-a-date')).toBe('');
        });
    });
});
