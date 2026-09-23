// Types for the moderation / leaderboard-editing backend.
// Mirrors the as-shipped contract in
// docs/superpowers/specs/2026-05-24-moderation-backend-contract-actual.md.
// Field names + casing are exactly what the backend reads/writes — do not "fix" them.

import type {
    PlayersRange,
    RunParticipant,
    VodReviewPatch,
} from './leaderboards.types';

// ── Shared ────────────────────────────────────────────────────────────────

/** Timing vocab for mod/self endpoints. (The public board read uses 'rt'|'gt'.) */
export type ModTiming = 'realtime' | 'gametime';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type ManualTimeSource = 'mod' | 'self' | 'system';

/** Runner identity for §A create/preview request bodies (discriminated). */
export type RunnerRef = { userId: number } | { guestName: string };

/**
 * One member of a roster being written — an account by id, an account by name
 * (the server resolves it), or a guest. Never more than one key per member;
 * `userId` beats `username` beats `name`.
 *
 * NOT `RunnerRef`: the roster shapes are the three in
 * docs/frontend-guide-co-op-runs.md §2, and the guest key there is `name`,
 * not `guestName`. `src/lib/moderation/run-roster.ts` re-exports this as
 * `RosterMemberInput`, so the roster edit and the two filing doors all write
 * one definition.
 */
export type RosterMemberRef =
    | { userId: number }
    | { username: string }
    | { name: string };

export interface AffectedLeaderboard {
    categoryId: number;
    subcategoryKey: string;
}

// ── §A Manual times ─────────────────────────────────────────────────────────

export interface ManualTimeRow {
    id: number;
    userId: number | null;
    guestName: string | null;
    runnerName: string;
    categoryId: number;
    subcategoryKey: string;
    timing: ModTiming;
    timeMs: number;
    evidenceUrl: string | null;
    /** Mod-asserted achievement date; null => createdAt stands in. */
    runDate: string | null;
    verificationStatus: VerificationStatus;
    source: ManualTimeSource;
    createdBy: number;
    createdByName: string;
    reason: string;
    createdAt: string;
    /** Everyone the time credits, in filing order — board-masked exactly like
     *  the public board's roster (guide §6a). ABSENT MEANS SOLO: never `[]`,
     *  never null, and absent on an older backend deploy too. */
    participants?: RunParticipant[];
}

export interface ManualTimeFilter {
    categoryId?: number;
    subcategoryKey?: string;
    userId?: number;
    runnerName?: string;
}

/** rankChanges entry in the manual-time preview (uses `timeMs`). */
export interface ManualRankChange {
    runnerName: string;
    userId: number | null;
    currentRank: number | null;
    newRank: number | null;
    timeMs: number | null;
}

export interface ManualTimePreviewInput {
    runnerRef: RunnerRef;
    categoryId: number;
    subcategoryKey?: string;
    timing: ModTiming;
    timeMs: number;
}

export interface ManualTimePreviewResult {
    resultingEntry: { rank: number | null; timeMs: number };
    beatsExistingEntry: boolean;
    affectedLeaderboards: Array<{
        categoryId: number;
        subcategoryKey: string;
        rankChanges: ManualRankChange[];
    }>;
}

/**
 * The other clock on a paired submission. `timing` must be the opposite of the
 * request's own `timing` — two clocks are two `manual_times` rows, and the
 * table is unique per (runner, slice, timing), so a matching one is a 400.
 */
export interface SecondaryTimeInput {
    timing: ModTiming;
    timeMs: number;
}

export interface CreateManualTimeInput {
    runnerRef: RunnerRef;
    categoryId: number;
    subcategoryKey?: string;
    timing: ModTiming;
    timeMs: number;
    secondary?: SecondaryTimeInput | null;
    evidenceUrl?: string | null;
    /** Mod-asserted date the time was achieved (ISO date); omitted/null =>
     *  the board shows the manual time's created-at instead. */
    runDate?: string | null;
    vodReview?: VodReviewPatch;
    /** Everyone else this time credits, alongside `runnerRef` — who is on the
     * team implicitly and must NOT be repeated here (an entry resolving back
     * to them is ignored, not refused). Absent means a solo filing; so do `[]`
     * and an array naming only the filer. Outside the board's players range
     * the whole filing is REFUSED with a sentence to show as given
     * (docs/frontend-guide-co-op-runs.md §11.2). */
    participants?: RosterMemberRef[];
    reason: string;
}

/**
 * The entry that is on the board instead of the one just filed — same team,
 * same clock. It may be a run or a manual time, and it may still be pending:
 * a faster time nobody has looked at yet is still the row that team is on.
 */
export interface FilingBeatenBy {
    /** Which table the entry is in. */
    kind: 'run' | 'manual';
    /** `finished_runs.id` for a run, `manual_times.id` for a manual time. */
    id: number;
    timeMs: number;
    timing: string;
    runDate: string | null;
}

/**
 * Whether the filing that just went through is the row the board shows.
 *
 * A board keeps every time a team files and ranks the fastest of them
 * (docs/frontend-guide-co-op-runs.md §11.9), so a submission landing is not
 * proof of a board entry. Describes ONE clock: the board's.
 */
export interface FilingStanding {
    onBoard: boolean;
    /** Null when the time is held off the board on its own account — a roster
     * or a video rule — rather than out-ranked. There is nothing to name. */
    beatenBy: FilingBeatenBy | null;
}

export interface CreateManualTimeResult {
    id: number;
    /** The other clock's row, when one was sent. */
    secondaryId?: number | null;
    affectedLeaderboards: AffectedLeaderboard[];
    /** Absent on an older backend. */
    standing?: FilingStanding;
    /** The filing was identical, down to the millisecond on every clock, to
     * one already stored: `id` is that row and nothing was written. */
    resent?: boolean;
}

export interface ManualTimeVerdictInput {
    action: 'verify' | 'reject';
    reason: string;
}

export interface ManualTimeVerdictResult {
    id: number;
    verificationStatus: 'verified' | 'rejected';
}

export interface UpdateManualTimeInput {
    reason: string;
    timeMs?: number;
    /**
     * The other clock on a board that shows both. It is its own row, so
     * omitting this leaves that row alone; an explicit null removes it.
     */
    secondary?: SecondaryTimeInput | null;
    evidenceUrl?: string | null;
    /** Explicit null clears the date (created-at stands in again). */
    runDate?: string | null;
    vodReview?: VodReviewPatch | null;
}

export interface UpdateManualTimeResult {
    id: number;
    updated: true;
    /** The other clock's row after the edit; null when it was removed. */
    secondaryId?: number | null;
}

export interface DeleteManualTimeResult {
    deleted: true;
    affectedLeaderboards: AffectedLeaderboard[];
}

// ── §B Bulk verdicts ─────────────────────────────────────────────────────────

// `unverify` (verified → pending) is the one missing inverse (design doc
// §D.2) — backend support landed on board-mod-unified-log; see
// action-model.ts's undo-of-verify wiring in run-action-dialog.tsx.
export type VerdictAction = 'verify' | 'reject' | 'unreject' | 'unverify';

export interface VerdictPreviewInput {
    action: VerdictAction;
    runIds: number[];
}

export interface VerdictSampleRun {
    runId: number;
    runnerName: string;
    userId: number | null;
    categoryId: number;
    subcategoryKey: string;
    timeMs: number;
    currentStatus: string;
    newStatus: string;
}

export interface VerdictPreviewResult {
    affectedRunCount: number;
    affectedLeaderboards: AffectedLeaderboard[];
    sampleRuns: VerdictSampleRun[];
    /** The status every affected run will move to. */
    newStatus?: string;
    /** Current-status histogram of the runs targeted by the request. */
    statusBreakdown?: Record<string, number>;
    /** Requested runs whose current status makes the action a no-op (e.g. `unreject` on a verified run). */
    skippedRunCount?: number;
    /** Requested run ids that don't resolve to a real run. */
    notFoundRunCount?: number;
}

export type RejectionReasonKey =
    | 'no_video'
    | 'wrong_category'
    | 'timing_rule'
    | 'splits_inconsistent'
    | 'duplicate'
    | 'other';

export interface BulkVerdictInput {
    action: VerdictAction;
    runIds: number[];
    reason: string;
    /** Sent on reject. `other` needs a reason of 10+ characters. */
    reasonKey?: RejectionReasonKey;
}

export interface BulkVerdictResult {
    affectedRunCount: number;
    affectedLeaderboards: AffectedLeaderboard[];
    enqueuedRebuilds: Array<{ gameId: number; categoryId: number }>;
}

// ── §C Triage queue & reports ────────────────────────────────────────────────

export type FlagSeverity = 'low' | 'medium' | 'high';
export type FlagReason =
    | 'below_minimum'
    | 'pending_verification'
    | 'reported'
    | 'pb_jump'
    | 'duplicate'
    | 'missing_vod'
    | 'impossible'
    | 'fresh_account_top_n'
    | 'pending_self_claim'
    | 'appeal'
    | 'consistency'
    | 'live-match'
    | 'ambiguous_live_match'
    | 'no_live_match'
    | 'gold-beat'
    | 'pb-jump'
    | 'prior-runs'
    | 'top-n'
    | (string & {});
export type SuggestedAction =
    | 'reject'
    | 'exclude'
    | 'verify'
    | 'set_minimum'
    | 'none';

export interface QueueItemRun {
    runId: number;
    userId: number | null;
    runnerName: string;
    categoryId: number;
    categoryName: string;
    subcategoryKey: string;
    timeMs: number;
    gameTimeMs: number | null;
    vodUrl: string | null;
    verificationStatus: string;
    endedAt: string;
    verifiedVia?: VerifiedVia;
    verifiedAt?: string | null;
    autoVerifyResult?: AutoVerifyResult | null;
    /** Everyone the run credits, in filing order — board-masked exactly like
     *  the public board's roster (guide §6a). ABSENT MEANS SOLO: never `[]`,
     *  never null, and absent on an older backend deploy too. */
    participants?: RunParticipant[];
}

export interface QueueItem {
    flagId: number | null;
    reason: FlagReason;
    severity: FlagSeverity;
    details: Record<string, unknown>;
    run: QueueItemRun;
    suggestedAction: SuggestedAction;
    createdAt: string;
}

export interface QueueFilter {
    reason?: string;
    severity?: FlagSeverity;
    categoryId?: number;
    limit?: number;
    offset?: number;
    includeResolved?: boolean;
}

export interface ResolveFlagResult {
    resolved: true;
}

/** Mod-facing report row (C2). Raw SQL projection — note `timeMs` aliases fr.time. */
export interface ModReportRow {
    id: number;
    runId: number;
    reporterUserId: number;
    reason: string;
    createdAt: string;
    resolvedAt: string | null;
    resolution: 'upheld' | 'dismissed' | null;
    reporterName: string;
    runnerName: string;
    runnerUserId: number | null;
    gameId: number;
    categoryId: number;
    subcategoryKey: string;
    timeMs: number;
    /** Everyone the run credits, in filing order — board-masked exactly like
     *  the public board's roster (guide §6a). ABSENT MEANS SOLO: never `[]`,
     *  never null, and absent on an older backend deploy too. */
    participants?: RunParticipant[];
}

// ── §D Board policies ────────────────────────────────────────────────────────

export type PolicyType =
    | 'min_time'
    | 'max_time'
    | 'require_video_top_n'
    | 'auto_flag_pb_jump_pct'
    | 'auto_flag_faster_than_wr_pct'
    | 'auto_verify'
    | 'players';

export type AutoVerifyPreset = 'off' | 'lenient' | 'standard' | 'strict';

export type AutoVerifyPolicyValue = {
    preset: AutoVerifyPreset;
    neverTopN: number; // 0-1000; 0 disables the guard
    requireLive: boolean;
};

// Verdict detail stored on a run (finished_runs.auto_verify_result).
export type AutoVerifyCheckName =
    | 'consistency'
    | 'live-match'
    | 'gold-beat'
    | 'pb-jump'
    | 'prior-runs'
    | 'top-n';

export interface AutoVerifyCheckResult {
    pass: boolean;
    reason?: string;
    flagReason?: string;
    details: Record<string, unknown>;
}

/**
 * `could_not_check` means no judgement was reached at all — never treat it as a
 * soft pass. Mirrors src/leaderboards/auto-verify/types.ts.
 */
export type AutoVerifyOutcome = 'pass' | 'fail' | 'could_not_check';

/** Why nothing was judged. Only `awaiting_live` is retryable. */
export type AutoVerifyUncheckedReason =
    | 'awaiting_live'
    | 'no_splits_history'
    | 'attempt_not_found';

export interface AutoVerifyResult {
    preset: string;
    presetVersion: number;
    evaluatedAt: string;
    outcome: AutoVerifyOutcome;
    /** Set when and only when `outcome` is 'could_not_check'. */
    uncheckedReason?: AutoVerifyUncheckedReason | null;
    snapshotId: number | null;
    checks: Partial<Record<AutoVerifyCheckName, AutoVerifyCheckResult>>;
}

/**
 * Whose decision made this run verified. 'src' means speedrun.com's — the run
 * is verified here on the strength of being verified there.
 */
export type VerifiedVia = 'mod' | 'auto' | 'self' | 'src' | null;

// min_time policy value, as stored/validated by the backend.
export interface MinTimePolicyValue {
    minTimeMs?: number;
    minGameTimeMs?: number;
}
export interface RequireVideoTopNValue {
    n: number;
}
export interface PctPolicyValue {
    pct: number;
}
// players policy value, as stored/validated by the backend: how many
// runners a board (at whatever scope it's set) credits. `max` of null or
// omitted means no ceiling. The default when no policy row exists at any
// scope is { min: 1, max: null } — never write that pair to represent it.
export interface PlayersPolicyValue {
    min: number;
    /** `null` is no ceiling — the same meaning `PlayersRange.max` carries
     * everywhere else, where it is required. Required here too: a policy
     * value with no `max` key at all is not a shape the backend writes, and
     * treating one as "no ceiling" was the difference between this type and
     * every other statement of the same fact. */
    max: number | null;
}
export type PolicyValue =
    | MinTimePolicyValue
    | RequireVideoTopNValue
    | PctPolicyValue
    | PlayersPolicyValue
    | Record<string, unknown>;

export interface BoardPolicyRow {
    id: number;
    gameId: number;
    categoryId: number | null;
    subcategoryKey: string | null;
    policyType: PolicyType;
    value: Record<string, unknown>;
    createdBy: number;
    reason: string;
    createdAt: string;
}

export interface CreatePolicyInput {
    policyType: PolicyType;
    value: Record<string, unknown>;
    categoryId?: number | null;
    subcategoryKey?: string | null;
}

export interface UpdatePolicyInput {
    value: Record<string, unknown>;
}

export interface DeletePolicyResult {
    deleted: true;
}

// A dry run of a players-policy write: what it would do to the category's
// boards, without writing anything. `subcategoryKey` null/absent means the
// category-wide scope; `value` null previews DELETING the policy at that
// scope.
export interface PolicyPreviewInput {
    categoryId: number;
    subcategoryKey?: string | null;
    value: PlayersPolicyValue | null;
}

export interface PolicyPreviewResult {
    leaving: { total: number; incomplete: number; tooMany: number };
    returning: number;
    scanned: number;
}

// ── mass-management (shipped exclusion tooling) ──────────────────────────────

export interface UserEligibleRunRow {
    runId: number;
    categoryId: number;
    categoryName: string;
    subcategoryKey: string;
    time: number | null; // NOTE: `time`, not `timeMs`
    gameTime: number | null;
    primaryTiming: ModTiming;
    verificationStatus: string;
    vodUrl: string | null;
    endedAt: string;
    isLeaderboardEntry: boolean;
    isLeaderboardEntryGt: boolean;
    rank: number | null;
    totalRunners: number | null;
    /** Everyone the run credits, masked per its own board. Absent means
     * solo — never `[]`, never `null` (guide §9). */
    participants?: RunParticipant[];
}

export interface RosterFilter {
    subcategoryKey?: string;
    verificationStatus?: 'unverified' | 'verified' | 'rejected';
    hasVod?: boolean;
    runnerName?: string;
    endedAfter?: string;
    endedBefore?: string;
    markedForLater?: boolean;
    limit?: number;
    offset?: number;
}

/** One server-side page of the actual board (eligible-runs `onBoard` mode). */
export interface BoardPageFilter {
    subcategoryKey?: string;
    /** Which board: entry flags + sort column for real time or game time. */
    timing: 'rt' | 'gt';
    /** Inverted categories (`sortAscending: false`) rank longest time #1. */
    sortDesc?: boolean;
    /** Restrict rows to marked-for-later runs; totals stay board-wide. */
    markedOnly?: boolean;
    limit?: number;
    offset?: number;
}

export type BoardRow = LeaderboardRosterRow & {
    /** 1-based position on the full board — stable under markedOnly. */
    boardRank: number;
};

export interface BoardPage {
    rows: BoardRow[];
    /** Board entries for this timing/subcategory, ignoring markedOnly. */
    total: number;
    markedTotal: number;
}

export interface LeaderboardRosterRow {
    runId: number;
    userId: number | null;
    runnerName: string;
    subcategoryKey: string;
    time: number | null; // NOTE: `time`, not `timeMs`
    gameTime: number | null;
    verificationStatus: string;
    vodUrl: string | null;
    endedAt: string;
    isLeaderboardEntry: boolean;
    isLeaderboardEntryGt: boolean;
    /** Backend item 2 (2026-07-30 handoff): shared mark-for-later flag. */
    markedForLater?: boolean;
    /** Backend item 3: mod-set board assignment override; run data untouched. */
    boardOverride?: { categoryId: number; subcategoryKey: string } | null;
    /** Only present on board-page reads (`BoardRow`), absent on roster reads. */
    boardRank?: number;
    /** Runner metadata, batch-joined by the backend the same way the public
     *  board joins it. Null for guests, absent on older backend deploys —
     *  the curation runner cell degrades to no avatar / no flag. */
    picture?: string | null;
    country?: string | null;
    /** Everyone the run credits, in filing order — board-masked exactly like
     *  the public board's roster (guide §6a). ABSENT MEANS SOLO: never `[]`,
     *  never null, and absent on an older backend deploy too. */
    participants?: RunParticipant[];
}

export interface UserExclusionRuleInput {
    type: 'user';
    targetId: number;
    categoryId?: number | null;
}

export interface PreviewExcludeInput {
    runIds?: number[];
    rule?: UserExclusionRuleInput;
}

/** rankChanges entry in the exclude preview (uses `time`/`gameTime`). */
export interface ExcludeRankChange {
    runnerName: string;
    userId: number | null;
    currentRank: number;
    newRank: number | null;
    time: number | null;
    gameTime: number | null;
}

export interface PreviewExcludeResult {
    affectedRunCount: number;
    affectedLeaderboards: Array<{
        categoryId: number;
        categoryName: string;
        subcategoryKey: string;
        affectedInThisLeaderboard: number;
        rankChanges: ExcludeRankChange[];
    }>;
    sampleRuns: Array<{
        runId: number;
        runnerName: string;
        categoryName: string;
        subcategoryKey: string;
        time: number | null;
    }>;
}

export type ExcludeInput =
    | { runIds: number[]; reason: string }
    | { rule: UserExclusionRuleInput; reason: string };

export interface BulkExcludeResult {
    affectedRunCount: number;
    affectedLeaderboards: AffectedLeaderboard[];
}

export interface CreateRuleResult {
    ruleId: number;
    alreadyExists: boolean;
}

export interface IncludeInput {
    runIds: number[];
    reason: string;
}

export interface BulkIncludeResult {
    affectedRunCount: number;
    affectedLeaderboards: AffectedLeaderboard[];
}

export interface GameExclusionRuleRow {
    ruleId: number;
    type: 'user';
    targetId: number;
    targetDisplayName: string;
    categoryId: number | null;
    categoryName: string | null;
    reason: string | null;
    excludedBy: number;
    excludedByName: string;
    createdAt: string;
}

export interface DeleteRuleResult {
    deleted: true;
    reinstatedRunCount: number;
    affectedLeaderboards: AffectedLeaderboard[];
}

export interface ModActionRow {
    logId: number;
    userId: number;
    actorName: string;
    action: string;
    entity: string;
    target: string | null;
    remark: string | null;
    data: unknown;
    timestamp: string;
}

export interface ModActionsFilter {
    days?: number;
    limit?: number;
    offset?: number;
    /** Added alongside the existing contract (board-mod-unified-log). */
    categoryId?: number;
    targetUserId?: number;
}

/**
 * The structured `data` blob every unified-log writer puts on a `logs` row
 * (backend `src/services/mod-log.ts`). `ModActionRow.data` is typed `unknown`
 * because it is free-form per verb; this is the guaranteed subset, and the
 * mod-feed adapter narrows to it defensively.
 */
export interface ModActionLogData {
    gameId?: number | null;
    categoryId?: number | null;
    subject?: {
        userId?: number | null;
        username?: string | null;
        guestName?: string | null;
    } | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
}

// ── Anonymize (workstream C) ─────────────────────────────────────────────────
// Game-mod surface:  POST   /mod/v1/leaderboards/games/{gameId}/anonymize
//                    GET    /mod/v1/leaderboards/games/{gameId}/anonymize-rules
//                    DELETE /mod/v1/leaderboards/games/{gameId}/anonymize-rules/{ruleId}  (ADMIN)
// Admin surface:     GET|POST|DELETE /mod/admin/anonymize[/{ruleId}]  ({ result } envelope)
//
// Anonymize is permanent by design: the runs and ranks stay exactly where
// they are, only the public identity is replaced by a stable placeholder.
// Lifting is the admin-only safety valve.

export type AnonymizeType = 'run' | 'user';
/** Derived server-side from the rule's own gameId/categoryId columns. */
export type AnonymizeScope = 'global' | 'game' | 'category' | 'run';

export interface AnonymizeRule {
    ruleId: number;
    type: AnonymizeType;
    /** userId for `type: 'user'`, runId for `type: 'run'`. */
    targetId: number;
    /** NULL on a `type: 'run'` rule and on a GLOBAL user rule. */
    gameId: number | null;
    categoryId: number | null;
    /** Stable placeholder number — the N in "Anonymous runner #N". */
    anonId: number;
    /** The placeholder as rendered publicly. */
    displayName: string;
    scope: AnonymizeScope;
    reason: string;
    createdBy: number;
    createdAt: string;
    liftedAt: string | null;
    liftedBy: number | null;
    liftReason: string | null;
}

/**
 * What the mod-facing GETs return: the same rule with the REAL identities
 * resolved. Mods (and admins) must see who is masked — they need it to
 * enforce. Never render these on a public surface.
 */
export interface AnonymizeRuleWithNames extends AnonymizeRule {
    targetDisplayName: string | null;
    createdByName: string;
    liftedByName: string | null;
}

export interface CreateAnonymizeInput {
    type: AnonymizeType;
    targetId: number;
    /** Only meaningful for `type: 'user'` — narrows the rule to one board. */
    categoryId?: number | null;
    /** Min 10 characters, enforced client-side and by the backend. */
    reason: string;
}

/** Admin-only extra: `gameId: null` on a user rule is what makes it GLOBAL. */
export interface CreateAdminAnonymizeInput extends CreateAnonymizeInput {
    gameId?: number | null;
}

export interface CreateAnonymizeResult {
    rule: AnonymizeRule;
    /** True when an identical live rule already existed — a no-op, not an error. */
    alreadyExists: boolean;
}

export interface AnonymizeRuleQuery {
    includeLifted?: boolean;
    /** Game GET only — also returns site-wide rules that mask this game. */
    includeGlobal?: boolean;
    targetUserId?: number;
}

// ── §E Self-service ──────────────────────────────────────────────────────────

export interface SelfManualTimeInput {
    gameId: number;
    categoryId: number;
    timing: ModTiming;
    timeMs: number;
    /** The other clock, on a board that shows both. */
    secondary?: SecondaryTimeInput | null;
    subcategoryKey?: string;
    evidenceUrl?: string | null;
    description?: string | null;
    /** Date the runner says they achieved the time (ISO date); omitted/null =>
     *  the board shows the manual time's created-at instead. */
    runDate?: string | null;
    vodReview?: VodReviewPatch;
    /** Everyone else this time credits. The runner filing it is on the team
     * implicitly, so the array names the OTHERS; an entry resolving back to
     * them is ignored, not refused. Absent means solo. A two-clock submission
     * writes two rows and this roster applies to both — send it once
     * (docs/frontend-guide-co-op-runs.md §11.1). */
    participants?: RosterMemberRef[];
    reason?: string;
}

export interface SelfManualTimeResult {
    applied: 'instant' | 'provisional';
    manualTimeId: number;
    /** The other clock's row, when one was sent. */
    secondaryManualTimeId?: number | null;
    /** Absent on an older backend. */
    standing?: FilingStanding;
    /** The filing was identical, down to the millisecond on every clock, to
     * one already stored: `manualTimeId` is that row and nothing was written. */
    resent?: boolean;
}

export interface SelfRunVerdictInput {
    action: 'reject' | 'unreject';
    reason?: string;
}

export interface SelfRunVerdictResult {
    applied: 'instant' | 'provisional';
    noop?: true;
}

export interface SelfDeleteManualTimeResult {
    deleted: true;
}

/** Body for POST /v1/me/runs/{runId}/move (owner self-move, §E4). */
/**
 * `AffectedLeaderboard`-shaped (categoryId + subcategoryKey) — matches what
 * `selfMoveRunAction`'s `target` parameter carries. No `reason` field: the
 * action's `target` is a plain `AffectedLeaderboard` with no way for a
 * caller to supply one, so the backend's "Moved by the runner" default
 * always applies for self-moves.
 */
export type SelfMoveRunInput = AffectedLeaderboard;

export interface SelfMoveRunResult {
    moved: true;
    reverify: boolean;
}

/**
 * Shape shared by GET and DELETE /v1/me/anonymize — reports the caller's
 * ACTUAL resulting hidden state (which may still be true after a DELETE if a
 * moderator's overlapping rule survives). Not a bare `{ hidden: false }` on
 * DELETE — see docs/frontend-guide-self-moderation.md §3.
 */
export interface SelfAnonymizeState {
    hidden: boolean;
    selfApplied: boolean;
    ruleId: number | null;
    displayName: string | null;
}

/**
 * POST /v1/me/anonymize response. No `ruleId`/`selfApplied` — and
 * `alreadyExists: true` does NOT prove the caller owns the resulting rule
 * (it may be a moderator's pre-existing game-scope rule). Callers needing
 * ownership must re-GET afterward.
 */
export interface SelfAnonymizeApplyResult {
    hidden: true;
    displayName: string;
    alreadyExists: boolean;
}

// ── §F Reports ───────────────────────────────────────────────────────────────

export interface CreateReportInput {
    runId: number;
    reason: string;
}

export interface CreateReportResult {
    reported: boolean;
}

// ── §G Appeals, history, notifications ───────────────────────────────────────

export type HistoryEventType =
    | 'verdict'
    | 'manual_time'
    | 'exclusion'
    | 'report'
    | 'appeal'
    // Board-mod-unified-log [backend, branch board-mod-unified-log]: the
    // migrated auditLog writers (true edit-run, move/board-override,
    // mark-for-later) now surface through the same `logs`-backed history
    // feed under these three event types.
    | 'edit'
    | 'move'
    | 'mark'
    | 'other';

export interface HistoryEvent {
    type: HistoryEventType;
    action: string;
    byRole: 'mod' | 'self' | 'system';
    reason: string | null;
    at: string;
    detail?: Record<string, unknown>;
    /** Mod-only enrichment (backend 2026-08-08): present when the caller can
     * moderate the run's game. logId keys the unified-log row; `by` is the
     * acting user's real identity (null for system writers). */
    logId?: number;
    by?: { userId: number; name: string } | null;
}

export interface AppealInput {
    reason: string;
}

export interface AppealResult {
    appealed: true;
}

export type NotificationType =
    | 'run_needs_video'
    | 'run_video_waived'
    | 'verdict_applied'
    | 'pb_awaiting_submission'
    | 'manual_time_created'
    | 'manual_time_verdict'
    | 'manual_time_deleted'
    | 'board_claim_approved'
    | 'board_claim_denied'
    | 'runs_off_board'
    | 'run_participant_added'
    | 'run_roster_incomplete'
    | 'run_participant_left'
    | 'run_participant_removed'
    | 'runs_imported_credit'
    | 'run_removed'
    | 'run_restored'
    | (string & {});

/**
 * Fields a notification payload can carry. Names are written when the
 * notification is created; older rows get `gameSlug`, `gameDisplay`,
 * `categorySlug` and `categoryDisplay` filled in on read from their ids, but
 * never `runId`, `manualTimeId` or `subcategoryKey`. Slugs are null when the
 * game or category was deleted. Rows keep `payload` loosely typed because
 * every field is read defensively.
 */
export interface NotificationPayload {
    gameId?: number;
    /** `games.name` — what `resolveGame` accepts. */
    gameSlug?: string | null;
    gameDisplay?: string | null;
    categoryId?: number;
    /** `categories.name`. */
    categorySlug?: string | null;
    categoryDisplay?: string | null;
    /** Board slice key; `""` for the base board. */
    subcategoryKey?: string;
    /**
     * Which entry the notice is about. A run notice carries `runId` and
     * `manualTimeId: null`; a manual-time notice is the other way round
     * (guide §11.8) — so branch on which of the two is SET, never on the
     * notification type.
     */
    runId?: number | null;
    manualTimeId?: number | null;
    timeMs?: number;
    /** verdict_applied */
    action?: 'verify' | 'reject' | 'unreject' | 'unverify';
    reasonKey?: string | null;
    /** verdict_applied (reject) / run_removed — the moderator's reason text.
     * Only set for a reject or a removal; absent on older rows. */
    note?: string | null;
    /** manual_time_created */
    byMod?: boolean;
    /** manual_time_verdict */
    verdict?: 'verified' | 'rejected';
    /** board_claim_approved */
    role?: string;
    /**
     * board_claim_denied (a free-text reason), or run_roster_incomplete
     * (`'participants_incomplete' | 'participants_too_many'`, guide §4 —
     * absent on a deploy that predates it; read as
     * `payload.reason ?? "participants_incomplete"`).
     */
    reason?: string | null;
    /** runs_off_board — how many of this runner's runs on this game came off */
    runs?: number;
    /** run_participant_added — already masked; render as-is, never resolve
     * the id to a name. Null on a masked actor, exactly when the name is
     * masked. */
    addedByUserId?: number | null;
    addedByName?: string | null;
    /** run_roster_incomplete — same masking rule as addedByUserId/addedByName,
     * and both null on the filing-door variant, where nobody edited anything
     * (guide §4). */
    changedByUserId?: number | null;
    changedByName?: string | null;
    /**
     * run_participant_left / run_roster_incomplete (departure variant) — who
     * came off the roster. Always an array, even for a single departure —
     * a moderator can drop several seats in one edit. Each entry is masked by
     * the same rule as addedByName: a hidden account's `userId` is null and
     * its `name` is its placeholder. A guest a moderator removed carries
     * `userId: null` and their own name (guide §4).
     */
    left?: Array<{ userId: number | null; name: string }>;
    /**
     * run_participant_left / run_participant_removed / run_roster_incomplete
     * — who did the removing, already masked. Non-null only when someone was
     * taken off by somebody other than themselves; both null on a plain
     * self-removal (guide §4).
     */
    removedByUserId?: number | null;
    removedByName?: string | null;
    /**
     * run_roster_incomplete — the board's resolved runner range at the time
     * of the notice. `max: null` means no ceiling. Absent/null when the
     * policy was dropped between the hold and the notice (guide §4).
     */
    players?: PlayersRange | null;
    /**
     * runs_imported_credit — how many of this game's runs the import
     * credited the recipient on. `runIds` is a sample of at most five, not
     * the whole set — do not assume it is exhaustive. No `runnerName`: this
     * type names no one, and the bell links off the viewer's own session
     * instead (`linkFor`'s `sessionUsername` parameter).
     */
    jobId?: number;
    runCount?: number;
    runIds?: number[];
}

export interface NotificationRow {
    id: number;
    userId: number;
    type: NotificationType;
    payload: Record<string, unknown>;
    readAt: string | null;
    createdAt: string;
}

export interface NotificationFilter {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
}

// ── Run provenance (mod-only full chain) ─────────────────────────────────────

export interface ProvenanceEntityRef {
    gameId: number;
    gameName: string;
    categoryId: number;
    categoryName: string;
}

export interface ProvenanceReassignment {
    kind: 'game' | 'category';
    reassignmentId: number;
    from: ProvenanceEntityRef;
    to: ProvenanceEntityRef;
    movedAt: string;
    undoneAt: string | null;
    performedBy: { userId: number; name: string } | null;
}

export interface ProvenanceIdentity {
    fromGuestName: string | null;
    fromUserId: number | null;
    to: { userId: number; name: string } | null;
    mergedAt: string;
    performedBy: { userId: number; name: string } | null;
}

export interface RunProvenance {
    ingest: {
        path:
            | 'timer'
            | 'guest_submit'
            | 'submission'
            | 'manual_mod'
            | 'manual_self'
            | null;
        submittedBy: { userId: number; name: string } | null;
        createdBy: { userId: number; name: string } | null;
        reason: string | null;
        ingestedAt: string | null;
        speedrunRunId: string | null;
        platform: string | null;
        emulator: boolean | null;
        rawVariables: Record<string, string> | null;
    };
    reassignments: ProvenanceReassignment[];
    identity: ProvenanceIdentity[];
    moderation: {
        modNote: string | null;
        ineligibleReason: string | null;
        excluded: boolean;
        verifyQueueHidden: boolean;
    };
}

export interface MarkAllReadResult {
    read: number;
}

// ── §F Public per-game moderation log ────────────────────────────────────────
// GET /mod/v1/leaderboards/games/{gameId}/mod-log — no auth required. Backend
// branch board-mod-unified-log. `action` is a growing deny-list feed, not a
// closed enum — unknown values must render a generic fallback label rather
// than crash (see src/lib/moderation/describe-log-action.ts).
/**
 * The runner an event was about. Identity is confined to this object so the
 * backend's redaction pass can replace it wholesale.
 *
 * On the PUBLIC feed, an anonymized subject arrives already redacted:
 * `userId`/`guestName` null, `username` = the stable placeholder, plus
 * `anonymized: true` and `anonId`. On the MODERATOR feed (mod-actions, real
 * identities) the frontend sets the same two fields itself, from the game's
 * anonymize-rules, so a mod can see *that* a subject is publicly masked
 * while still reading the real name — see `src/lib/moderation/mod-feed.ts`.
 */
export interface PublicModLogSubject {
    userId: number | null;
    username: string | null;
    guestName: string | null;
    anonymized?: boolean;
    anonId?: number;
}

export interface PublicModLogEntry {
    id: number;
    action: string;
    entity: string;
    target: string | null;
    /** Set when `entity === 'finished_run'`. */
    runId: number | null;
    at: string; // ISO-8601 UTC
    actor: { userId: number; username: string };
    subject: PublicModLogSubject | null;
    gameId: number | null;
    categoryId: number | null;
    reason: string | null;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
}

export interface PublicModLogPage {
    items: PublicModLogEntry[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/* ------------------------------------------------------------------ *
 * Mod queue — GET /v1/leaderboards/mod-queue/{gameId}
 * ------------------------------------------------------------------ */

/** Which slice of the queue to read. `pending` (the default) also hides runs
 *  outside their category's verification window (`verify_queue_hidden`). */
export type ModQueueStatus = 'pending' | 'verified' | 'rejected' | 'all';

/** One run awaiting a verdict. Richer than `LeaderboardRosterRow`: the queue
 *  spans every visible board, so each row names its own category, and it
 *  carries the submission metadata a verdict is actually made on (platform,
 *  emulator, variables, why it is ineligible). */
export interface ModQueueItem {
    id: number;
    runnerName: string;
    userId: number | null;
    time: number | null;
    gameTime: number | null;
    categoryId: number;
    categoryDisplay: string;
    subcategoryKey: string;
    verificationStatus: string;
    vodUrl: string | null;
    platform: string | null;
    emulator: boolean;
    variables: Record<string, string> | null;
    excluded: boolean;
    exclusionReason: string | null;
    isGuest: boolean;
    /** The run's end date (ISO), despite the name — the backend maps
     *  `ended_at` onto this field. */
    createdAt: string;
    ineligibleReason: string | null;
    leaderboardEligible: boolean;
    verifiedVia?: VerifiedVia;
    verifiedAt?: string | null;
    autoVerifyResult?: AutoVerifyResult | null;
    /** Everyone the run credits, in filing order — board-masked exactly like
     *  the public board's roster (guide §6a). ABSENT MEANS SOLO: never `[]`,
     *  never null, and absent on an older backend deploy too. */
    participants?: RunParticipant[];
}

export interface ModQueuePage {
    items: ModQueueItem[];
    totalItems: number;
    page: number;
    pageSize: number;
}

export interface ModQueueFilter {
    /** Omit for every visible board of the game. */
    categoryId?: number;
    status?: ModQueueStatus;
    page?: number;
    /** Backend caps this at 100. */
    pageSize?: number;
}
