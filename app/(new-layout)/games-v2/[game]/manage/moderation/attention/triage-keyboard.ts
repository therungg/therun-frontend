// Pure keyboard/selection logic for fast triage on the attention pane.
// DOM wiring (event listeners, focus/scrollIntoView, dialog-open state)
// lives in needs-attention.tsx — this module only maps raw inputs to
// decisions so the behavior is trivially testable.

export type TriageAction = 'up' | 'down' | 'approve' | 'remove';

interface TriageKeyInput {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
}

/**
 * Map a keydown event's relevant fields to a semantic triage action, or
 * `null` when the key isn't a triage shortcut. A held modifier (Ctrl/Cmd/Alt)
 * always yields `null` — triage keys never hijack a browser shortcut like
 * Cmd+R (reload) or Ctrl+R (Firefox reload / Chrome address-bar search).
 */
export function parseTriageKey(e: TriageKeyInput): TriageAction | null {
    if (e.ctrlKey || e.metaKey || e.altKey) return null;
    switch (e.key) {
        case 'j':
        case 'ArrowDown':
            return 'down';
        case 'k':
        case 'ArrowUp':
            return 'up';
        case 'v':
            return 'approve';
        case 'r':
            return 'remove';
        default:
            return null;
    }
}

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
