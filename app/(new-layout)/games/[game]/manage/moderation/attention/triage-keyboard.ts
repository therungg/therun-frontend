// Pure keyboard/selection logic for fast triage on the attention pane.
// DOM wiring (event listeners, focus/scrollIntoView, dialog-open state)
// lives in needs-attention.tsx — this module only maps raw inputs to
// decisions so the behavior is trivially testable.

export type TriageAction = 'up' | 'down' | 'approve' | 'remove' | 'toggle';

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
        case 'x':
            return 'toggle';
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

// ---- Batch selection (checkbox multi-select) ---------------------------
// Pure Set operations backing the per-card checkbox, the `x` keyboard
// toggle, and a runner group's "select all" checkbox. Every function
// returns a new Set rather than mutating its input, matching moveSelection's
// style above and keeping React state updates straightforward.

/**
 * Toggle one key's membership in a selection set — backs the `x` keyboard
 * shortcut and a single card's own checkbox.
 */
export function toggleSelected(
    selected: ReadonlySet<string>,
    key: string,
): Set<string> {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
}

/**
 * Add (`select: true`) or remove (`select: false`) a whole batch of keys in
 * one step — backs a runner group's "select all" checkbox.
 */
export function setManySelected(
    selected: ReadonlySet<string>,
    keys: readonly string[],
    select: boolean,
): Set<string> {
    const next = new Set(selected);
    for (const key of keys) {
        if (select) next.add(key);
        else next.delete(key);
    }
    return next;
}

/**
 * Whether every one of `keys` is already selected — drives a runner group's
 * select-all checkbox checked state. An empty `keys` list reads as `false`
 * (there's nothing to select all of), not vacuously true.
 */
export function allKeysSelected(
    selected: ReadonlySet<string>,
    keys: readonly string[],
): boolean {
    return keys.length > 0 && keys.every((key) => selected.has(key));
}

/**
 * Narrow a selection down to only the keys still present in `keys` — used
 * when the rendered/filtered card set shrinks (a filter narrows the list, or
 * a triaged item leaves) so the bulk bar never claims something is selected
 * that's no longer visible or no longer exists.
 */
export function intersectSelected(
    selected: ReadonlySet<string>,
    keys: readonly string[],
): Set<string> {
    const keep = new Set(keys);
    const next = new Set<string>();
    for (const key of selected) {
        if (keep.has(key)) next.add(key);
    }
    return next;
}

// ---- Ordered card keys (roving selection + queue position) -------------

/** The minimal group shape flattenTriageOrder needs — mirrors RunnerGroup
 * from attention-model.ts without importing it into this pure module. */
export interface TriageGroupLike {
    userId: number | null;
    items: readonly { key: string }[];
}

/**
 * Flatten grouped attention items into the exact key order the cards render
 * in — the same array previously re-derived per keydown via a
 * `[data-triage-card]` DOM query. A single-item group always contributes its
 * one key. A multi-item runner group only contributes its items' keys while
 * expanded (a collapsed group renders nothing selectable, mirroring the
 * DOM — see needs-attention.tsx's RunnerGroupCard). Shared by the roving
 * j/k handler and the "{n} of {m}" queue-position indicator so both agree on
 * what's actually on screen.
 */
export function flattenTriageOrder(
    groups: readonly TriageGroupLike[],
    expandedGroups: ReadonlySet<number>,
): string[] {
    const keys: string[] = [];
    for (const g of groups) {
        if (g.items.length > 1) {
            if (g.userId != null && expandedGroups.has(g.userId)) {
                for (const it of g.items) keys.push(it.key);
            }
            continue;
        }
        for (const it of g.items) keys.push(it.key);
    }
    return keys;
}

/**
 * 1-based position of `selectedKey` within the ordered card keys, for the
 * "{n} of {m}" indicator — `null` when nothing is selected or the selected
 * key isn't currently rendered (e.g. its group just got collapsed).
 */
export function queuePosition(
    orderedKeys: readonly string[],
    selectedKey: string | null,
): { n: number; m: number } | null {
    if (selectedKey == null) return null;
    const idx = orderedKeys.indexOf(selectedKey);
    if (idx === -1) return null;
    return { n: idx + 1, m: orderedKeys.length };
}
