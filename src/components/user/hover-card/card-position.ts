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
    /** Set when the card hangs below the trigger. */
    top?: number;
    /**
     * Set when the card sits above the trigger. Distance from the viewport's
     * bottom edge, so the card's own bottom lands GAP above the name whatever
     * height it turns out to be. Positioning a flipped card by `top` would
     * need its height in advance, and using the maximum leaves a short card
     * floating far above the name it belongs to.
     */
    bottom?: number;
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

    // Left-align with the trigger, then pull back inside the viewport rather
    // than centring: a name at the left edge should stay next to its name.
    const maxLeft = viewport.width - CARD_WIDTH - EDGE;
    const left = Math.max(EDGE, Math.min(anchor.left, Math.max(EDGE, maxLeft)));

    if (flipped) {
        return {
            left,
            bottom: Math.max(EDGE, viewport.height - anchor.top + GAP),
            flipped,
        };
    }

    return { left, top: anchor.bottom + GAP, flipped };
}

/** How tall the card may grow in this placement before it starts scrolling. */
export function availableHeight(
    anchor: Rect,
    viewport: Viewport,
    flipped: boolean,
): number {
    const room = flipped
        ? anchor.top - GAP - EDGE
        : viewport.height - anchor.bottom - GAP - EDGE;

    return Math.max(120, Math.min(CARD_MAX_HEIGHT, room));
}
