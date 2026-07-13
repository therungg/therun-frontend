import { describe, expect, test } from 'vitest';
import { FIXTURES, fixturePost, fixturePrep } from '~src/lib/fast50/fixtures';
import { composeDeck } from '../deck/compose-deck';
import { composePreppedDeck } from '../deck/compose-prepped-deck';

describe('composePreppedDeck', () => {
    test('no prep: identical to composeDeck', () => {
        const { slides, warnings } = composePreppedDeck(FIXTURES.grinder, null);
        expect(slides).toEqual(composeDeck(FIXTURES.grinder));
        expect(warnings).toEqual([]);
    });

    test('default interleave (pre): quote after intro, clip after roadmap, called-shot last before overflow', () => {
        const { slides } = composePreppedDeck(FIXTURES.grinder, fixturePrep);
        const ids = slides.map((s) => s.id);
        expect(ids[ids.indexOf('intro') + 1]).toBe('fixture-quote-1');
        expect(ids[ids.indexOf('roadmap') + 1]).toBe('fixture-clip-1');
        const nonOverflow = slides.filter((s) => !s.overflow);
        expect(nonOverflow[nonOverflow.length - 1].id).toBe('goal');
        expect(ids).toContain('fixture-fact-1');
    });

    test('default interleave (post): verdict directly after result', () => {
        const { slides } = composePreppedDeck(fixturePost.grinder, fixturePrep);
        const ids = slides.map((s) => s.id);
        expect(ids[ids.indexOf('result') + 1]).toBe('goal-result');
    });

    test('frozen order: exact structure, stat slides re-evaluated', () => {
        const prep = {
            ...fixturePrep,
            deckOrder: {
                pre: [
                    { kind: 'stat' as const, id: 'intro' },
                    { kind: 'custom' as const, id: 'fixture-quote-1' },
                    { kind: 'stat' as const, id: 'grind' },
                ],
            },
        };
        const { slides, warnings } = composePreppedDeck(FIXTURES.grinder, prep);
        expect(slides.map((s) => s.id)).toEqual([
            'intro',
            'fixture-quote-1',
            'grind',
        ]);
        expect(slides[2].evaluation.score).toBeGreaterThan(0);
        expect(warnings).toEqual([]);
    });

    test('frozen order: unavailable stat slide dropped with warning', () => {
        const prep = {
            ...fixturePrep,
            deckOrder: {
                // sparse fixture has no danger-zone story
                pre: [
                    { kind: 'stat' as const, id: 'intro' },
                    { kind: 'stat' as const, id: 'danger-zone' },
                ],
            },
        };
        const { slides, warnings } = composePreppedDeck(FIXTURES.sparse, prep);
        expect(slides.map((s) => s.id)).toEqual(['intro']);
        expect(warnings).toHaveLength(1);
    });

    test('frozen order: deleted custom content skipped with warning; unknown stat id tolerated', () => {
        const prep = {
            ...fixturePrep,
            deckOrder: {
                pre: [
                    { kind: 'custom' as const, id: 'deleted-quote' },
                    { kind: 'stat' as const, id: 'not-a-slide' },
                    { kind: 'stat' as const, id: 'intro' },
                ],
            },
        };
        const { slides, warnings } = composePreppedDeck(FIXTURES.grinder, prep);
        expect(slides.map((s) => s.id)).toEqual(['intro']);
        expect(warnings).toHaveLength(2);
    });
});
