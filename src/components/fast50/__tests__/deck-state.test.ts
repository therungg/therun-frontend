import { describe, expect, test } from 'vitest';
import { deckReducer, initialDeckState } from '../deck/deck-state';

const ctx = { slideCount: 3, stagesPerSlide: 3 };

describe('deckReducer', () => {
    test('advance walks stages then slides', () => {
        let s = initialDeckState;
        s = deckReducer(s, { type: 'ADVANCE', ...ctx });
        expect(s).toMatchObject({ slideIndex: 0, stage: 1 });
        s = deckReducer(s, { type: 'ADVANCE', ...ctx });
        s = deckReducer(s, { type: 'ADVANCE', ...ctx });
        expect(s).toMatchObject({ slideIndex: 1, stage: 0 });
    });
    test('advance clamps at the last stage of the last slide', () => {
        let s = { slideIndex: 2, stage: 2, blackout: false };
        s = deckReducer(s, { type: 'ADVANCE', ...ctx });
        expect(s).toMatchObject({ slideIndex: 2, stage: 2 });
    });
    test('back returns to the previous slide fully revealed', () => {
        let s = { slideIndex: 1, stage: 1, blackout: false };
        s = deckReducer(s, { type: 'BACK', ...ctx });
        expect(s).toMatchObject({ slideIndex: 0, stage: 2 });
        s = deckReducer(s, { type: 'BACK', ...ctx });
        expect(s).toMatchObject({ slideIndex: 0, stage: 2 });
    });
    test('goto jumps fully revealed; blackout toggles and unsets on advance', () => {
        let s = deckReducer(initialDeckState, {
            type: 'GOTO',
            index: 2,
            ...ctx,
        });
        expect(s).toMatchObject({ slideIndex: 2, stage: 2 });
        s = deckReducer(s, { type: 'TOGGLE_BLACKOUT', ...ctx });
        expect(s.blackout).toBe(true);
        s = deckReducer(s, { type: 'ADVANCE', ...ctx });
        expect(s.blackout).toBe(false);
    });
});
