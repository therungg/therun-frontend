// Pure keyboard/selection logic for fast triage. DOM wiring (event
// listeners, focus/scrollIntoView, dialog-open state) lives with the lists
// that use it — this module only maps raw inputs to decisions so the
// behavior is trivially testable.

interface TriageInertInput {
    /** `document.activeElement?.tagName`, or null if nothing is focused. */
    activeTag: string | null;
    isContentEditable: boolean;
    dialogOpen: boolean;
}

/**
 * Whether triage shortcuts should be ignored right now: a dialog is open, or
 * focus sits in a text field / contenteditable region that should keep the
 * keystroke instead of triggering triage.
 */
export function isTriageInert({
    activeTag,
    isContentEditable,
    dialogOpen,
}: TriageInertInput): boolean {
    if (dialogOpen || isContentEditable) return true;
    const tag = activeTag?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
}

/**
 * Move the roving triage selection by one card. `keys` is the current
 * ordered list of selectable card keys (DOM order, already filtered down to
 * whatever is actually rendered — e.g. a collapsed runner group's items are
 * simply absent); `current` is the presently selected key, or null.
 *
 * Clamped, not wrapping — stepping past either end holds at the boundary.
 * Falls back to the first/last key when `current` isn't in the list (no
 * selection yet, or the previously selected card was just triaged away).
 */
export function moveSelection(
    keys: readonly string[],
    current: string | null,
    direction: 'up' | 'down',
): string | null {
    if (keys.length === 0) return null;
    const idx = current == null ? -1 : keys.indexOf(current);
    if (idx === -1)
        return direction === 'down' ? keys[0] : keys[keys.length - 1];
    const next = direction === 'down' ? idx + 1 : idx - 1;
    return keys[Math.max(0, Math.min(keys.length - 1, next))];
}
