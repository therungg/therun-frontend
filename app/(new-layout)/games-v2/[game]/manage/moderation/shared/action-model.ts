// The vocabulary of run moderation. One Remove verb replaces the old
// reject-verdict / exclude-run split; the chosen reason decides whether the
// removal is "loud" (a reject verdict — runner notified, appealable) or "quiet"
// (a silent exclusion). See spec §3–§4.

// `reject` is a bulk-bar-only addition (board multi-select, workstream B):
// a direct verdict rejection (loud, notified, appealable) with no
// notify-toggle/reason-category picker — those are `remove`'s nuance for
// the single-row case. Distinct verbs so Verify/Reject/Remove can sit
// side-by-side per the approved bulk-bar mock, matching the design's
// verb table (verify/reject/restore → mod-verdicts-handler; remove/restore
// → exclude/include).
// `unverify` unsets a verification (verified → pending) without removing the
// run — the standing offer on a verified run beside Remove, for "this
// shouldn't have been verified (yet)" without any judgement on the run itself.
export type ModVerb =
    | 'approve'
    | 'unverify'
    | 'reject'
    | 'remove'
    | 'restore'
    | 'ban';

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
 * is reversed by the `unverify` verdict action (verified → pending, design
 * doc §D.2) — see UNDO_VERIFY_REASON and run-action-dialog.tsx's dedicated
 * undo branch for `approve` (it does NOT go through restoreRunsAction; that
 * would fire `unreject` at an already-verified run, which the backend
 * silently no-ops). `remove` is reversed by restoreRunsAction (include +
 * unreject, whichever mechanism removal used). `restore` is reversed by
 * exclude. `ban` is reversed by deleting the exclusion rule it created — see
 * isBanUndoable for the extra condition that gates it. Every ModVerb now has
 * a true inverse.
 */
export function hasTrueInverse(_verb: ModVerb): boolean {
    return true;
}

/**
 * Canned, non-editable reason sent when a moderator undoes a Verify from the
 * undo toast — no reason prompt (the undo toasts never re-open a dialog),
 * but the backend still requires `reason` (min 10 chars) on every verdict.
 */
export const UNDO_VERIFY_REASON = 'Undo of accidental verification';

/**
 * Min reason length the backend's `validateReason` enforces on anonymize
 * rules. Lives here (not in the action file) because `'use server'` modules
 * may only export async functions.
 */
export const MIN_ANONYMIZE_REASON = 10;

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

/**
 * Default ban-dialog scope for banning every item in a group (e.g. a
 * runner-group card's "Ban runner…" action). Picking "this category" when
 * the group's items actually span several categories would be an arbitrary
 * choice of one of them — default to "entire game" instead, which covers
 * everything the moderator is looking at. A group confined to one category
 * keeps the more surgical "this category" default.
 */
export function defaultBanScopeForCategories(
    categoryIds: Array<number | null>,
): BanScope {
    const distinct = new Set(
        categoryIds.filter((id): id is number => id != null),
    );
    return distinct.size > 1 ? 'game' : 'category';
}

/** What a dialog instance acts on. `ban` requires a `runner` target; the rest require `runs`.
 *
 * `manualTimeIds` rides along on the `runs` kind for board selections that
 * include manual set times: approve/reject map to the manual-time verdict
 * endpoint, remove maps to delete. There is no preview or undo for the
 * manual portion (the backend has neither), and `restore` skips it —
 * a deleted manual time has nothing to restore to. */
export type RunActionTarget =
    | {
          kind: 'runs';
          runIds: number[];
          manualTimeIds?: number[];
          label: string;
          /** The target's board time (ms on the board's primary clock) and
           *  run date, shown on Remove's "This run" card so the question is
           *  answerable without leaving the dialog. */
          runTimeMs?: number | null;
          runDate?: string | null;
          /**
           * Who and where, when the selection is one run by one known runner.
           * Present only then, because it unlocks a choice that only makes
           * sense then: Remove can ask whether the mod means this run or
           * every run this runner has on this board. A guest (no account) or
           * a multi-run selection leaves this absent and Remove stays
           * per-run.
           */
          runner?: {
              id: number;
              name: string;
              categoryId: number;
              categoryDisplay: string;
              /** Which board exactly — their other times are listed from it. */
              subcategoryKey: string;
              /** The clock this board ranks on, for ordering those times. */
              primaryTiming: 'rt' | 'gt';
          };
      }
    | {
          kind: 'runner';
          runnerId: number;
          runnerName: string;
          categoryId: number;
          categoryDisplay: string;
          gameDisplay: string;
      };
