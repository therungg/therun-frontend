// The vocabulary of run moderation. One Remove verb replaces the old
// reject-verdict / exclude-run split; the chosen reason decides whether the
// removal is "loud" (a reject verdict — runner notified, appealable) or "quiet"
// (a silent exclusion). See spec §3–§4.

export type ModVerb = 'approve' | 'remove' | 'restore' | 'ban';

export type RemoveReason = 'cheating' | 'breaks_rules' | 'doesnt_belong';

export interface RemoveReasonMeta {
    value: RemoveReason;
    label: string;
    /** Shown under the picker so the consequence is legible. */
    blurb: string;
    /** Default for the "Notify runner" toggle; notify ⟺ loud ⟺ reject path. */
    defaultNotify: boolean;
}

export const REMOVE_REASONS: RemoveReasonMeta[] = [
    {
        value: 'cheating',
        label: 'Cheating / falsified',
        blurb: 'Spliced VOD, TAS, manipulated timer. The runner is notified and can appeal.',
        defaultNotify: true,
    },
    {
        value: 'breaks_rules',
        label: 'Breaks the rules',
        blurb: 'Wrong version, illegal strat, or a missed category requirement. The runner is notified and can appeal.',
        defaultNotify: true,
    },
    {
        value: 'doesnt_belong',
        label: "Doesn't belong",
        blurb: 'Duplicate, test/joke run, or superseded by a better time. Removed quietly — no notification, no appeal.',
        defaultNotify: false,
    },
];

export function removeReasonMeta(reason: RemoveReason): RemoveReasonMeta {
    // Non-null: REMOVE_REASONS covers every RemoveReason member.
    return REMOVE_REASONS.find((r) => r.value === reason) as RemoveReasonMeta;
}

/**
 * A loud removal is a `reject` verdict (status change, notification, appeal);
 * a quiet removal is a silent `exclude`. The notify toggle is the single switch.
 */
export function resolveRemoveMechanism(notify: boolean): 'reject' | 'exclude' {
    return notify ? 'reject' : 'exclude';
}

/**
 * Whether a verb has a true backend inverse — a real mutation that reverses
 * it, not a fabricated "undo" that just hides the toast. `approve` (verify)
 * has none: there is no un-verify/back-to-pending endpoint today (flagged in
 * the Backend handoff). `remove` is reversed by restoreRunsAction (include +
 * unreject, whichever mechanism removal used). `restore` is reversed by
 * exclude. `ban` is reversed by deleting the exclusion rule it created — see
 * isBanUndoable for the extra condition that gates it.
 */
export function hasTrueInverse(verb: ModVerb): boolean {
    return verb !== 'approve';
}

/**
 * A ban's undo is deleting the exclusion rule it created. If the rule
 * already existed (this ban just matched a pre-existing one — see
 * CreateRuleResult.alreadyExists), deleting it would remove a rule outside
 * this action's scope, not undo this action. So it's not offered.
 */
export function isBanUndoable(result: { alreadyExists: boolean }): boolean {
    return !result.alreadyExists;
}

/** Audit note attached to an undo mutation. */
export function undoReason(verb: ModVerb): string {
    return `Undo of ${verb}`;
}

export type BanScope = 'category' | 'game';

/** What a dialog instance acts on. `ban` requires a `runner` target; the rest require `runs`. */
export type RunActionTarget =
    | { kind: 'runs'; runIds: number[]; label: string }
    | {
          kind: 'runner';
          runnerId: number;
          runnerName: string;
          categoryId: number;
          categoryDisplay: string;
          gameDisplay: string;
      };
