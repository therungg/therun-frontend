import { describe, expect, it } from 'vitest';
import {
    applyDraftToParams,
    draftCount,
    draftEquals,
    draftFromApplied,
    emptyDraft,
} from './filter-draft';

const off = {
    verified: false,
    video: null,
    from: null,
    to: null,
    country: null,
};

describe('filter-draft', () => {
    it('builds a draft from applied state, splitting multi-values', () => {
        const d = draftFromApplied(
            { ...off, verified: true },
            { route: 'a,b', platform: '' },
        );
        expect(d.varFilters).toEqual({ route: ['a', 'b'] });
        expect(d.builtins.verified).toBe(true);
    });

    it('counts built-ins plus every selected value', () => {
        expect(
            draftCount(
                draftFromApplied(
                    {
                        ...off,
                        from: '2024-01-01',
                        to: '2024-06-30',
                        country: 'NL',
                    },
                    { route: 'a,b' },
                ),
            ),
        ).toBe(4);
        expect(draftCount(emptyDraft())).toBe(0);
    });

    it('equality is structural', () => {
        const a = draftFromApplied(
            { ...off, video: 'required' },
            { route: 'a' },
        );
        const b = draftFromApplied(
            { ...off, video: 'required' },
            { route: 'a' },
        );
        expect(draftEquals(a, b)).toBe(true);
        expect(draftEquals(a, emptyDraft())).toBe(false);
    });

    it('writes every key to the params and drops page', () => {
        const sp = new URLSearchParams(
            'category=x&page=3&route=z&verified=true',
        );
        applyDraftToParams(
            sp,
            {
                builtins: {
                    ...off,
                    video: 'missing',
                    from: '2024-01-01',
                    to: null,
                    country: 'nl',
                },
                varFilters: { route: ['a', 'b'] },
            },
            ['route', 'platform'],
        );
        expect(sp.toString()).toBe(
            'category=x&route=a%2Cb&video=missing&from=2024-01-01&country=NL',
        );
    });
});
