import { describe, expect, it } from 'vitest';
import type { RejectOptions } from '../../../../../../types/reject-options.types';
import {
    banBlocked,
    chunkIds,
    consequenceOf,
    scopeRunIds,
    scopeWithout,
    submitLabel,
} from './reject-scope';

const opts = (over: Partial<RejectOptions> = {}): RejectOptions => ({
    runner: { name: 'Bob', userId: 7, teamKey: 'u:7', isCoop: false },
    board: { categoryId: 1, categoryDisplay: 'Any%', subcategoryKey: '' },
    runs: [],
    allRunIds: [10, 11, 12],
    entryAfter: null,
    bans: { category: false, game: false },
    ...over,
});
const names = { category: 'Any%', game: 'Super Mario 64' };

describe('scopeRunIds', () => {
    it('maps each reject scope to its ids', () => {
        expect(scopeRunIds({ kind: 'run' }, 10, opts())).toEqual([10]);
        expect(
            scopeRunIds({ kind: 'select', runIds: [11, 12] }, 10, opts()),
        ).toEqual([11, 12]);
        expect(scopeRunIds({ kind: 'all' }, 10, opts())).toEqual([10, 11, 12]);
        expect(scopeRunIds({ kind: 'ban', scope: 'game' }, 10, opts())).toEqual(
            [],
        );
    });
    it('falls back to the one run when options never loaded', () => {
        expect(scopeRunIds({ kind: 'all' }, 10, null)).toEqual([10]);
    });
});

describe('scopeWithout', () => {
    it('asks the server the matching question', () => {
        expect(scopeWithout({ kind: 'run' })).toBeNull();
        expect(scopeWithout({ kind: 'select', runIds: [3] })).toEqual([3]);
        expect(scopeWithout({ kind: 'all' })).toBe('all');
        expect(scopeWithout({ kind: 'ban', scope: 'category' })).toBe('all');
    });
});

describe('chunkIds', () => {
    it('splits into batches of 500', () => {
        const ids = Array.from({ length: 1201 }, (_, i) => i);
        const chunks = chunkIds(ids);
        expect(chunks.map((c) => c.length)).toEqual([500, 500, 201]);
        expect(chunks.flat()).toEqual(ids);
    });
    it('empty in, empty out', () => {
        expect(chunkIds([])).toEqual([]);
    });
});

describe('submitLabel', () => {
    it('names what the button does', () => {
        expect(submitLabel({ kind: 'run' }, 10, opts(), names)).toBe(
            'Reject 1 run',
        );
        expect(
            submitLabel(
                { kind: 'select', runIds: [1, 2, 3] },
                10,
                opts(),
                names,
            ),
        ).toBe('Reject 3 runs');
        expect(
            submitLabel({ kind: 'select', runIds: [] }, 10, opts(), names),
        ).toBe('Select runs');
        expect(submitLabel({ kind: 'all' }, 10, opts(), names)).toBe(
            'Reject 3 runs',
        );
        expect(
            submitLabel({ kind: 'ban', scope: 'category' }, 10, opts(), names),
        ).toBe('Ban from Any%');
        expect(
            submitLabel({ kind: 'ban', scope: 'game' }, 10, opts(), names),
        ).toBe('Ban from Super Mario 64');
    });
});

describe('banBlocked', () => {
    it('blocks guests, co-op and existing bans', () => {
        expect(banBlocked(opts(), 'game')).toBeNull();
        expect(
            banBlocked(
                opts({
                    runner: {
                        name: 'g',
                        userId: null,
                        teamKey: 'g:g',
                        isCoop: false,
                    },
                }),
                'game',
            ),
        ).toBe("Guest runners can't be banned");
        expect(
            banBlocked(
                opts({
                    runner: {
                        name: 'a',
                        userId: 7,
                        teamKey: 'u:7|u:8',
                        isCoop: true,
                    },
                }),
                'category',
            ),
        ).toBe('Ban individual runners from the runner menu');
        expect(
            banBlocked(
                opts({ bans: { category: true, game: false } }),
                'category',
            ),
        ).toBe('Already banned');
        expect(
            banBlocked(opts({ bans: { category: true, game: false } }), 'game'),
        ).toBeNull();
    });
});

describe('consequenceOf', () => {
    it('describes where the runner ends up', () => {
        expect(consequenceOf(null)).toEqual({ kind: 'leaves' });
        expect(
            consequenceOf({
                kind: 'run',
                runId: 1,
                timeMs: 5,
                endedAt: '2026-03-12T00:00:00.000Z',
            }),
        ).toEqual({
            kind: 'drops',
            timeMs: 5,
            endedAt: '2026-03-12T00:00:00.000Z',
            manual: false,
        });
        expect(
            consequenceOf({
                kind: 'manual',
                runId: null,
                timeMs: 9,
                endedAt: null,
            }),
        ).toEqual({ kind: 'drops', timeMs: 9, endedAt: null, manual: true });
    });
});
