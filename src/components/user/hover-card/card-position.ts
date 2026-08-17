export interface Rect {
    top: number;
    left: number;
    bottom: number;
    right: number;
    width: number;
}

export interface Viewport {
    width: number;
    height: number;
}

export interface CardPlacement {
    left: number;
    top: number;
    /** Above the trigger, because there was no room below. */
    flipped: boolean;
}

export const CARD_WIDTH = 320;
export const CARD_MAX_HEIGHT = 340;
const GAP = 8;
const EDGE = 8;

/**
 * Position-only, viewport coordinates, for a `position: fixed` card. Kept pure
 * so the flip and clamp behaviour is testable without a browser — this is the
 * part that goes wrong on a runner at the bottom-right of a leaderboard.
 */
export function placeCard(anchor: Rect, viewport: Viewport): CardPlacement {
    const roomBelow = viewport.height - anchor.bottom;
    const flipped = roomBelow < CARD_MAX_HEIGHT + GAP && anchor.top > roomBelow;

    const top = flipped
        ? Math.max(EDGE, anchor.top - GAP - CARD_MAX_HEIGHT)
        : anchor.bottom + GAP;

    // Left-align with the trigger, then pull back inside the viewport rather
    // than centring: a name at the left edge should stay next to its name.
    const maxLeft = viewport.width - CARD_WIDTH - EDGE;
    const left = Math.max(EDGE, Math.min(anchor.left, Math.max(EDGE, maxLeft)));

    return { left, top, flipped };
}
