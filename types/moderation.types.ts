// Types for the moderation / leaderboard-editing backend.
// Mirrors the as-shipped contract in
// docs/superpowers/specs/2026-05-24-moderation-backend-contract-actual.md.
// Field names + casing are exactly what the backend reads/writes — do not "fix" them.

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

export interface CreateManualTimeInput {
    runnerRef: RunnerRef;
    categoryId: number;
    subcategoryKey?: string;
    timing: ModTiming;
    timeMs: number;
    evidenceUrl?: string | null;
    reason: string;
}

export interface CreateManualTimeResult {
    id: number;
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

export type VerdictAction = 'verify' | 'reject' | 'unreject';

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
    limit?: number;
    offset?: number;
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
}

// ── §E Self-service ──────────────────────────────────────────────────────────

export interface SelfManualTimeInput {
    gameId: number;
    categoryId: number;
    timing: ModTiming;
    timeMs: number;
    subcategoryKey?: string;
    evidenceUrl?: string | null;
    reason?: string;
}

export interface SelfManualTimeResult {
    applied: 'instant' | 'provisional';
    manualTimeId: number;
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
    | 'other';

export interface HistoryEvent {
    type: HistoryEventType;
    action: string;
    byRole: 'mod' | 'self' | 'system';
    reason: string | null;
    at: string;
    detail?: Record<string, unknown>;
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

export interface MarkAllReadResult {
    read: number;
}
