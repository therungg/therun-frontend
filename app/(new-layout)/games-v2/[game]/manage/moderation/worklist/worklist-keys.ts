// Keyboard decisions for the queue. The same letters as the moderate modal
// (a to approve, d to decline) so a moderator's hands don't change when it
// opens. DOM wiring lives in worklist-pane.tsx.

export type QueueKeyAction =
    | 'down'
    | 'up'
    | 'open'
    | 'approve'
    | 'approveGroup'
    | 'decline'
    | 'clear';

export function parseQueueKey(e: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
}): QueueKeyAction | null {
    if (e.ctrlKey || e.metaKey || e.altKey) return null;
    switch (e.key) {
        case 'j':
        case 'ArrowDown':
            return 'down';
        case 'k':
        case 'ArrowUp':
            return 'up';
        case 'Enter':
            return 'open';
        case 'a':
            return 'approve';
        case 'A':
            return 'approveGroup';
        case 'd':
            return 'decline';
        case 'Escape':
            return 'clear';
        default:
            return null;
    }
}

/**
 * Where the keyboard lands after the list reloads. Stays put if the row is
 * still there; otherwise takes the next row that survived, so pressing `a`
 * down a list approves one run after another without touching `j`. Falls
 * back to the nearest earlier survivor at the end of the list.
 */
export function focusAfterReload(
    previous: readonly string[],
    next: readonly string[],
    current: string | null,
): string | null {
    if (current === null || next.length === 0) return null;
    if (next.includes(current)) return current;
    const survivors = new Set(next);
    const at = previous.indexOf(current);
    if (at === -1) return null;
    for (let i = at + 1; i < previous.length; i++)
        if (survivors.has(previous[i])) return previous[i];
    for (let i = at - 1; i >= 0; i--)
        if (survivors.has(previous[i])) return previous[i];
    return next[0];
}
