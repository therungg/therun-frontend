import { describe, expect, test } from 'vitest';
import { FIXTURES, fixturePost } from '~src/lib/fast50/fixtures';
import { composeDeck } from '../deck/compose-deck';

describe('composeDeck pre', () => {
    test('anchors always lead: intro then roadmap', () => {
        const deck = composeDeck(FIXTURES.grinder);
        expect(deck[0].id).toBe('intro');
        expect(deck[1].id).toBe('roadmap');
    });
    test('grinder leads with grind or one-shot, includes danger-zone', () => {
        const deck = composeDeck(FIXTURES.grinder);
        const main = deck.filter((s) => !s.anchor && !s.overflow);
        expect(main.length).toBeLessThanOrEqual(4);
        expect(['grind', 'one-shot']).toContain(main[0].id);
        expect(main.map((s) => s.id)).toContain('danger-zone');
    });
    test('prodigy leads with world-class or profile, no danger-zone', () => {
        const deck = composeDeck(FIXTURES.prodigy);
        const ids = deck
            .filter((s) => !s.anchor && !s.overflow)
            .map((s) => s.id);
        expect(['world-class', 'profile']).toContain(ids[0]);
        expect(ids).not.toContain('danger-zone');
    });
    test('sparse degrades to anchors + few slides, never crashes', () => {
        const deck = composeDeck(FIXTURES.sparse);
        expect(deck[0].id).toBe('intro');
        expect(
            deck.filter((s) => !s.anchor && !s.overflow).length,
        ).toBeLessThanOrEqual(2);
    });
    test('overflow contains remaining scored slides, sorted by score', () => {
        const deck = composeDeck(FIXTURES.grinder);
        const overflow = deck.filter((s) => s.overflow);
        for (let i = 1; i < overflow.length; i++) {
            expect(overflow[i].evaluation.score).toBeLessThanOrEqual(
                overflow[i - 1].evaluation.score,
            );
        }
    });
});

describe('composeDeck post', () => {
    test('result anchors the post deck', () => {
        const deck = composeDeck(fixturePost.grinder);
        expect(deck[0].id).toBe('result');
        expect(deck.map((s) => s.id)).toContain('gold-rush');
    });
    test('no post slides without postRun', () => {
        const deck = composeDeck({ ...fixturePost.grinder, postRun: null });
        expect(deck.filter((s) => !s.anchor)).toHaveLength(0);
    });
    test('where-it-lands present with enough history', () => {
        const deck = composeDeck(fixturePost.grinder);
        expect(deck.map((s) => s.id)).toContain('where-it-lands');
    });
});
