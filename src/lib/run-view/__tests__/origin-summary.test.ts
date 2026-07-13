import { describe, expect, test } from 'vitest';
import type { RunOrigin } from '../../../../types/leaderboards.types';
import { originSummary } from '../origin-summary';

const base: RunOrigin = {
    path: null,
    submittedBy: null,
    speedrunRunId: null,
    ingestedAt: '2026-07-01T00:00:00.000Z',
};

describe('originSummary', () => {
    test('timer', () => {
        const s = originSummary({ ...base, path: 'timer' }, 'joey');
        expect(s?.line).toContain('Auto-tracked from a LiveSplit upload');
        expect(s?.showSplitsLink).toBe(true);
    });
    test('guest submit names the submitter', () => {
        const s = originSummary(
            {
                ...base,
                path: 'guest_submit',
                submittedBy: { userId: 1, name: 'modguy' },
            },
            'guestrunner',
        );
        expect(s?.line).toBe('Submitted on behalf of guestrunner by modguy');
        expect(s?.showSplitsLink).toBe(false);
    });
    test('manual self', () => {
        expect(
            originSummary({ ...base, path: 'manual_self' }, 'joey')?.line,
        ).toBe('Self-claimed by the runner');
    });
    test('manual mod', () => {
        expect(
            originSummary({ ...base, path: 'manual_mod' }, 'joey')?.line,
        ).toBe('Time asserted by a moderator');
    });
    test('null origin and null path both hide the panel', () => {
        expect(originSummary(undefined, 'joey')).toBeNull();
        expect(originSummary({ ...base, path: null }, 'joey')).toBeNull();
    });
});
