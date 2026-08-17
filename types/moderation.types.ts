// Types for the moderation / leaderboard-editing backend.
// Mirrors the as-shipped contract in
// docs/superpowers/specs/2026-05-24-moderation-backend-contract-actual.md.
// Field names + casing are exactly what the backend reads/writes — do not "fix" them.

import type { VodReviewPatch } from './leaderboards.types';

// ── Shared ────────────────────────────────────────────────────────────────

/** Timing vocab for mod/self endpoints. (The public board read uses 'rt'|'gt'.) */
export type ModTiming = 'realtime' | 'gametime';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type ManualTimeSource = 'mod' | 'self' | 'system';

/** Runner identity for §A create/preview request bodies (discriminated). */
export type RunnerRef = { userId: number } | { guestName: string };

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
    reason: string;
}

export interface CreateManualTimeResult {
    id: number;
    /** The other clock's row, when one was sent. */
    secondaryId?: number | null;
    affectedLeaderboards: AffectedLeaderboard[];
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
    evidenceUrl?: string | null;
    /** Explicit null clears the date (created-at stands in again). */
    runDate?: string | null;
    vodReview?: VodReviewPatch | null;
}

export interface UpdateManualTimeResult {
    id: number;
    updated: true;
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

export interface BulkVerdictInput {
    action: VerdictAction;
    runIds: number[];
    reason: string;
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
}

// ── §D Board policies ────────────────────────────────────────────────────────

export type PolicyType =
    | 'min_time'
    | 'max_time'
    | 'require_video_top_n'
    | 'auto_flag_pb_jump_pct'
    | 'auto_flag_faster_than_wr_pct';

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
export type PolicyValue =
    | MinTimePolicyValue
    | RequireVideoTopNValue
    | PctPolicyValue
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
    description?: string;
    /** Date the runner says they achieved the time (ISO date); omitted/null =>
     *  the board shows the manual time's created-at instead. */
    runDate?: string | null;
    vodReview?: VodReviewPatch;
    reason?: string;
}

export interface SelfManualTimeResult {
    applied: 'instant' | 'provisional';
    manualTimeId: number;
    /** The other clock's row, when one was sent. */
    secondaryManualTimeId?: number | null;
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
    | 'manual_time_created'
    | 'manual_time_verdict'
    | 'manual_time_deleted'
    | 'verdict_applied'
    | 'board_claim_approved'
    | 'board_claim_denied'
    | (string & {});

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
