// Types for the moderator worklist. Mirrors the backend contract in
// docs/frontend-guide-worklist.md — field names and casing are exactly what
// the backend reads/writes, do not "fix" them.

export type WorklistTier = 1 | 2 | 3;

export type WorklistReason = {
    reason: string; // run_flags.reason, or "pending_verification" for a plain pending run
    severity: 'low' | 'medium' | 'high';
    flagId: number | null; // null for pending_verification
    createdAt: string; // ISO; for pending_verification, the run's endedAt
    details: Record<string, unknown>;
};

export type WorklistTrackRecord = {
    userId: number;
    accountCreatedAt: string | null;
    verifiedRuns: number; // site-wide
    rejectedRuns: number; // site-wide
    verifiedRunsThisGame: number;
    rejectedRunsThisGame: number;
    gamesRun: number; // distinct games with any finished run
    hasLiveTracked: boolean; // any live_run_snapshots row
    trusted: boolean; // an auto_verify_grants row covers this game (game-wide or any category)
    trustOffer: boolean; // see Trust below
};

export type WorklistItem = {
    runId: number;
    tier: WorklistTier;
    reasons: WorklistReason[]; // never empty
    runnerName: string;
    userId: number | null;
    isGuest: boolean;
    categoryId: number;
    categoryName: string; // slug
    categoryDisplay: string;
    subcategoryKey: string;
    primaryTiming: 'realtime' | 'gametime';
    time: number; // ms, real time
    gameTime: number | null; // ms
    previousPb: number | null; // ms, on the primary clock
    deltaMs: number | null; // boardTime - previousPb; negative = faster
    wouldBeRank: number; // 1-based, among the board's non-rejected entries, primary clock
    verificationStatus: 'pending' | 'verified' | 'rejected';
    vodUrl: string | null;
    endedAt: string; // ISO
    waitingSince: string; // ISO; earliest of endedAt and open flag createdAt
    verifiedVia: 'mod' | 'grant' | 'auto' | 'self' | null;
    autoVerifyResult: unknown | null; // same shape as the run detail's autoVerifyResult
    leaderboardEligible: boolean;
    excluded: boolean;
    ineligibleReason: string | null;
    trackRecord: WorklistTrackRecord | null; // null for guests
};

/** The worklist page's waitingOnRunners slot: runs held back for a missing video, owner only (guests are flagged, never hidden). */
export type WaitingOnRunners = {
    count: number;
    items: {
        runId: number;
        runnerName: string;
        userId: number;
        categoryId: number;
        categoryDisplay: string;
        subcategoryKey: string;
        timeMs: number;
        askedAt: string | null; // when the video was first asked for; null if no ask was logged
        lastNudgedAt: string | null;
    }[]; // at most 50, oldest ask first; count is the full total
};

export type WorklistBatchKind = 'trusted_clean' | 'same_runner';

export type WorklistBatch = {
    key: string; // stable: "trusted_clean" or "runner:{userId|g:name}"
    kind: WorklistBatchKind;
    label: string; // e.g. "12 runs from runners you've verified before, all checks clean"
    runIds: number[];
    items: WorklistItem[]; // every member, same order as runIds
};

export type WorklistSelfClaim = {
    manualTimeId: number;
    runnerName: string;
    userId: number | null;
    isGuest: boolean;
    categoryId: number;
    categoryName: string;
    categoryDisplay: string;
    subcategoryKey: string;
    timing: 'realtime' | 'gametime';
    timeMs: number;
    evidenceUrl: string | null;
    /** ISO; the date the runner says they got it. */
    runDate: string | null;
    /** What the runner wrote with the claim. */
    note: string | null;
    /** ISO; when it was claimed. */
    createdAt: string;
    trackRecord: WorklistTrackRecord | null;
};

export type WorklistPage = {
    /** The boards this list covers: featured categories, then levels. Nothing else is moderated. */
    boards: { id: number; display: string }[];
    /** tier1 and needsYou include selfClaims. */
    counts: {
        needsYou: number;
        tier1: number;
        tier2: number;
        tier3: number;
        selfClaims: number;
    };
    /** Tier 1: times runners typed in themselves, oldest first, not paged, at most 200. */
    selfClaims: WorklistSelfClaim[];
    waitingOnRunners: WaitingOnRunners;
    batches: WorklistBatch[]; // tier-3 groups; complete on every page
    items: WorklistItem[]; // tier 1, tier 2, then unbatched tier 3, paged
    totalItems: number; // length of the unbatched list
    page: number;
    pageSize: number;
    truncated: boolean; // true when the candidate cap (2000) was hit
};

export type WorklistDigest = {
    days: number;
    since: string; // ISO
    autoVerified: number; // verified_via in ('auto','grant') within the window
    modVerified: number; // verified_via = 'mod', status verified, within the window
    declined: number; // status rejected, verified_at within the window
    flagged: { reason: string; count: number }[]; // run_flags created within the window
};

export type TrustState = {
    userId: number;
    trusted: boolean;
    trustOffer: boolean;
    approvalsSinceDecline: number;
};

export type TrustGrant = {
    id: number;
    userId: number;
    username: string | null;
    gameId: number;
    categoryId: number | null; // null = the whole game
    createdBy: number;
    reason: string | null;
    createdAt: string;
};

export type WorklistFilter = {
    categoryId?: number;
    page?: number;
    pageSize?: number;
};
