import { describe, expect, it } from 'vitest';
import { CARD_MAX_HEIGHT, CARD_WIDTH, placeCard } from '../card-position';

const anchor = (over: Partial<Parameters<typeof placeCard>[0]> = {}) => ({
    top: 100,
    left: 200,
    bottom: 120,
    right: 300,
    width: 100,
    ...over,
});

const viewport = { width: 1440, height: 900 };

describe('placeCard', () => {
    it('sits under the name it belongs to', () => {
        const placement = placeCard(anchor(), viewport);

        expect(placement.flipped).toBe(false);
        expect(placement.top).toBe(128);
        expect(placement.left).toBe(200);
    });

    it('flips above a name near the bottom of the viewport', () => {
        const placement = placeCard(
            anchor({ top: 860, bottom: 880 }),
            viewport,
        );

        expect(placement.flipped).toBe(true);
        expect(placement.top).toBe(860 - 8 - CARD_MAX_HEIGHT);
    });

    it('stays below when neither side has room, preferring the taller side', () => {
        // A short viewport: no room either way, but there is more above.
        const placement = placeCard(anchor({ top: 200, bottom: 220 }), {
            width: 1440,
            height: 300,
        });

        expect(placement.flipped).toBe(true);
        expect(placement.top).toBeGreaterThanOrEqual(8);
    });

    it('pulls a right-edge name back inside the viewport', () => {
        const placement = placeCard(anchor({ left: 1400 }), viewport);

        expect(placement.left).toBe(viewport.width - CARD_WIDTH - 8);
    });

    it('never places the card off the left edge', () => {
        const placement = placeCard(anchor({ left: -40 }), viewport);

        expect(placement.left).toBe(8);
    });

    it('keeps the card on screen in a viewport narrower than the card', () => {
        const placement = placeCard(anchor({ left: 100 }), {
            width: 200,
            height: 900,
        });

        expect(placement.left).toBe(8);
    });
});
