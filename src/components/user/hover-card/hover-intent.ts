/**
 * Hover intent for the user card. Two delays, both load-bearing:
 *
 * - OPEN_DELAY keeps a mouse crossing the page from firing a request per link
 *   it passes over. Nothing is fetched until the pointer settles.
 * - CLOSE_DELAY is the grace period for travelling from the name into the card
 *   itself; without it the card closes under the cursor on the way there.
 */
export const OPEN_DELAY = 250;
export const CLOSE_DELAY = 160;

type Timer = ReturnType<typeof setTimeout>;

export interface HoverIntent {
    /** Pointer or focus entered the trigger or the card. */
    enter: () => void;
    /** Pointer or focus left the trigger or the card. */
    leave: () => void;
    /** Skip the open delay — keyboard focus should not have to wait. */
    openNow: () => void;
    /** Close with no grace period (Escape, click-through, unmount). */
    closeNow: () => void;
    cancel: () => void;
}

export function createHoverIntent(
    onChange: (open: boolean) => void,
    schedule: (fn: () => void, ms: number) => Timer = setTimeout,
    unschedule: (timer: Timer) => void = clearTimeout,
): HoverIntent {
    let timer: Timer | null = null;

    const clear = () => {
        if (timer !== null) {
            unschedule(timer);
            timer = null;
        }
    };

    const setIn = (ms: number, open: boolean) => {
        clear();
        timer = schedule(() => {
            timer = null;
            onChange(open);
        }, ms);
    };

    return {
        enter: () => setIn(OPEN_DELAY, true),
        leave: () => setIn(CLOSE_DELAY, false),
        openNow: () => {
            clear();
            onChange(true);
        },
        closeNow: () => {
            clear();
            onChange(false);
        },
        cancel: clear,
    };
}
