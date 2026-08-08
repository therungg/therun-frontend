// Maps a run-history event to the mutation that reverses it — the inline
// Undo on the inspector's timeline. Client-side mapping (the backend undo
// endpoint only covers exclusion-rule actions): each entry pairs a logged
// action with the same inverse the action's own undo toast uses.
//
// Only the run's LATEST event is ever offered for undo — reversing an older
// event underneath newer ones wouldn't restore the state the timeline shows,
// it would manufacture a new one.

import type {
    HistoryEvent,
    VerdictAction,
} from '../../../../../types/moderation.types';

export type HistoryUndoPlan =
    /** Re-verdict (verify↔unverify). */
    | { kind: 'verdict'; action: VerdictAction }
    /** include + unreject — reverses reject verdicts and excludes. */
    | { kind: 'restore' }
    /** Quiet exclude — reverses restores/includes/unrejects. */
    | { kind: 'exclude' }
    /** Flip the mark-for-later flag back. */
    | { kind: 'mark'; marked: boolean };

const PLAN_FOR_ACTION: Record<string, HistoryUndoPlan> = {
    verdict_verify: { kind: 'verdict', action: 'unverify' },
    'bulk-verify': { kind: 'verdict', action: 'unverify' },
    verdict_unverify: { kind: 'verdict', action: 'verify' },
    verdict_reject: { kind: 'restore' },
    'bulk-reject': { kind: 'restore' },
    exclude_run: { kind: 'restore' },
    bulk_exclude: { kind: 'restore' },
    verdict_unreject: { kind: 'exclude' },
    include_run: { kind: 'exclude' },
    bulk_include: { kind: 'exclude' },
    mark_run: { kind: 'mark', marked: false },
    unmark_run: { kind: 'mark', marked: true },
    // Deliberately absent: moves/board overrides (reversal needs the
    // previous target, which the event doesn't carry), exclusion RULES
    // (deleting one reaches beyond this run), manual-time events (no
    // inverse exists), reports/appeals (not mod actions).
};

/**
 * The undo mutation for `event`, or null when it has no safe inverse.
 * `isLatest` is the caller's assertion that no later event exists for this
 * run; without it there is no offer at all.
 */
export function historyUndoPlan(
    event: HistoryEvent,
    isLatest: boolean,
): HistoryUndoPlan | null {
    if (!isLatest) return null;
    // Only mod actions on the enriched (mod) feed — self/system events are
    // not this moderator's to reverse, and the plain public feed (no `by`)
    // must never grow mod controls.
    if (event.byRole !== 'mod' || event.by === undefined) return null;
    return PLAN_FOR_ACTION[event.action] ?? null;
}

/** Audit note for a timeline undo — satisfies the backend's min-10 reason. */
export function historyUndoReason(event: HistoryEvent): string {
    return `Undo of ${event.action} (from run history)`;
}
