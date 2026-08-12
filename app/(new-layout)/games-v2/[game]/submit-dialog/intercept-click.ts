/** The parts of a mouse event that decide whether it is a plain left click. */
export interface ClickModifiers {
    button: number;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    defaultPrevented: boolean;
}

/**
 * Whether a click on a submit link should open the dialog in place instead of
 * navigating.
 *
 * The trigger stays a real `<a href>` — the URL it points at is a working deep
 * link, and people middle-click and cmd-click things. Only a plain left click
 * is taken over; every modified click keeps the browser's own behaviour, which
 * is why this is a predicate rather than an unconditional preventDefault.
 */
export function shouldInterceptSubmitClick(e: ClickModifiers): boolean {
    if (e.defaultPrevented) return false;
    if (e.button !== 0) return false;
    return !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
}
