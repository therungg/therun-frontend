import { describe, expect, it } from 'vitest';
import {
    availableHeight,
    CARD_MAX_HEIGHT,
    CARD_WIDTH,
    placeCard,
} from '../card-position';

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
        expect(placement.bottom).toBeUndefined();
        expect(placement.left).toBe(200);
    });

    // Positioning a flipped card by `top` needs its height in advance. Using
    // the maximum leaves a short card floating far above the name it belongs
    // to, with a gap where the unused height would have been.
    it('hangs a flipped card off the name, not off its own max height', () => {
        const placement = placeCard(
            anchor({ top: 860, bottom: 880 }),
            viewport,
        );

        expect(placement.flipped).toBe(true);
        expect(placement.top).toBeUndefined();
        // 8px above the name's top edge, whatever height the card resolves to.
        expect(placement.bottom).toBe(viewport.height - 860 + 8);
    });

    it('flips toward the taller side when neither has full room', () => {
        // A short viewport: no room either way, but there is more above.
        const placement = placeCard(anchor({ top: 200, bottom: 220 }), {
            width: 1440,
            height: 300,
        });

        expect(placement.flipped).toBe(true);
        expect(placement.bottom).toBe(300 - 200 + 8);
    });

    it('bounds a flipped card to the room above the name', () => {
        expect(
            availableHeight(anchor({ top: 860, bottom: 880 }), viewport, true),
        ).toBe(CARD_MAX_HEIGHT);
        expect(
            availableHeight(anchor({ top: 120, bottom: 140 }), viewport, true),
        ).toBe(120);
    });

    it('bounds an unflipped card to the room below the name', () => {
        expect(availableHeight(anchor(), viewport, false)).toBe(
            CARD_MAX_HEIGHT,
        );
        expect(
            availableHeight(anchor({ top: 700, bottom: 720 }), viewport, false),
        ).toBe(164);
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
