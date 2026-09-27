// Types for the moderator worklist. Mirrors the backend contract in
// docs/frontend-guide-mod-queue.md — field names and casing are exactly what
// the backend reads/writes, do not "fix" them.

import type { AllRunsSource } from './all-runs.types';
import type { RunParticipant } from './leaderboards.types';

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
};

export type WorklistItem = {
    runId: number;
    reasons: WorklistReason[]; // the run's open flags; never empty
    runnerName: string;
    /** The runner's profile picture url, null for guests or none. */
    runnerPicture: string | null;
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
    // ISO; reported/appealed: when the earliest such flag was filed; else
    // earliest of endedAt and open flag createdAt
    waitingSince: string;
    verifiedVia: 'mod' | 'auto' | 'self' | 'src' | null;
    autoVerifyResult: unknown | null; // same shape as the run detail's autoVerifyResult
    leaderboardEligible: boolean;
    excluded: boolean;
    ineligibleReason: string | null;
    trackRecord: WorklistTrackRecord | null; // null for guests
    /** Everyone the run credits, in filing order — board-masked exactly like
     *  the public board's roster (guide §6a). ABSENT MEANS SOLO: never `[]`,
     *  never null, and absent on an older backend deploy too. */
    participants?: RunParticipant[];
};

/**
 * The worklist's waitingOnRunners slot: runs the board is waiting on a person
 * for — a missing video, or a PB held until its runner submits it. Owner only
 * (guests are flagged, never hidden).
 */
export type WaitingOnRunners = {
    count: number;
    items: {
        runId: number;
        runnerName: string;
        runnerPicture?: string | null;
        userId: number;
        categoryId: number;
        categoryDisplay: string;
        subcategoryKey: string;
        timeMs: number;
        /** What the board is waiting for. */
        waitingFor: 'video' | 'submission';
        askedAt: string | null; // when the video was first asked for; null if no ask was logged
        lastNudgedAt: string | null;
        /** Everyone the run credits, in filing order — board-masked exactly
         *  like the public board's roster (guide §6a). ABSENT MEANS SOLO:
         *  never `[]`, never null, and absent on an older deploy too. */
        participants?: RunParticipant[];
    }[]; // at most 50, oldest ask first; count is the full total
};

export type WorklistSelfClaim = {
    manualTimeId: number;
    runnerName: string;
    /** The runner's profile picture url, null for guests or none. */
    runnerPicture: string | null;
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
    /** Everyone the time credits, in filing order — masked exactly like the
     *  public board's roster (guide §6a). ABSENT MEANS SOLO: never `[]`,
     *  never null, and absent on an older backend deploy too. */
    participants?: RunParticipant[];
};

export type WorklistSort =
    | 'priority'
    | 'placing'
    | 'newest'
    | 'oldest'
    | 'improvement'
    | 'time';

/** Mirrors `QUEUE_REASONS` — one reason per item, in queue priority order. */
export type QueueReason =
    | 'reported'
    | 'appealed'
    | 'manual_submission'
    | 'auto_verify_failed'
    | 'removed_from_src'
    | 'missing_video'
    | 'auto_verify_unavailable'
    | 'not_verified_on_src'
    | 'new_pb';

export type QueueRan = '7d' | '30d' | '90d' | 'older30d';

export type WorklistFacets = {
    /** Subjects (runs + manual submissions) matching every filter. */
    total: number;
    /** board id -> subjects matching every filter but the category pick. */
    category: Record<string, number>;
    /** nameNormalized -> value -> n ('' = not set). Only with exactly one category picked. */
    vars: Record<string, Record<string, number>>;
    placing: { '1': number; '3': number; '10': number };
    ran: { '7d': number; '30d': number; '90d': number; older30d: number };
    video: { has: number; missing: number };
    source: { livesplit: number; manual: number; import: number };
    /** Every reason, zeros included; an item counts under its reason and each of its other reasons. */
    reason: Record<QueueReason, number>;
    newRunner: number;
};

/** Why an item is on the queue, and what the row needs to say about it. */
export type QueueMeta = {
    key: string; // "run:<id>" | "manual:<id>"
    reason: QueueReason;
    otherReasons: QueueReason[];
    detail: string | null; // the report or appeal text, for those two reasons
    failedChecks: string[];
    newRunner: boolean; // guest, or no verified run on any board of this game
    isOwn: boolean; // the caller ran it, is on its roster, or filed it
};

export type WorklistEntry =
    | ({ kind: 'run' } & WorklistItem & QueueMeta)
    | ({ kind: 'manual' } & WorklistSelfClaim & QueueMeta);

export type WorklistFilter = {
    categoryIds?: number[];
    /** nameNormalized -> values ('' = not set). Only with exactly one category. */
    vars?: Record<string, string[]>;
    maxRank?: 1 | 3 | 10;
    ran?: QueueRan;
    video?: 'has' | 'missing';
    source?: AllRunsSource[];
    reason?: QueueReason[];
    newRunner?: boolean;
    runner?: string;
    sort?: WorklistSort;
    page?: number;
    pageSize?: number;
};

export type WorklistPage = {
    boards: { id: number; display: string }[]; // the boards this list covers: featured, then levels
    counts: { total: number }; // every queued item for the game, no filters, no cap
    facets: WorklistFacets;
    waitingOnRunners: WaitingOnRunners;
    items: WorklistEntry[]; // filtered, in queue order (or the picked sort), paged
    totalItems: number; // filtered count
    page: number;
    pageSize: number;
    truncated: boolean; // true when the candidate cap (2000) was hit
};

export type WorklistDigest = {
    days: number;
    since: string; // ISO
    autoVerified: number; // verified_via = 'auto' within the window
    modVerified: number; // verified_via = 'mod', status verified, within the window
    declined: number; // status rejected, verified_at within the window
    flagged: { reason: string; count: number }[]; // run_flags created within the window
};
