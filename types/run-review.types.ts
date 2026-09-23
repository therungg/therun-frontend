// Types for a single run's review panel. Mirrors the backend contract in
// docs/frontend-guide-run-review.md — field names and casing are exactly what
// the backend reads/writes, do not "fix" them.

import type { WorklistTrackRecord } from './worklist.types';

export type ReviewReason = {
    reason: string; // run_flags.reason ('reported' | 'appeal' | a check name)
    severity: 'low' | 'medium' | 'high';
    createdAt: string; // ISO
    text: string | null; // report text or appeal text, when the reason carries one
    details: Record<string, unknown>;
};

export type PbPoint = {
    runId: number;
    endedAt: string; // ISO
    timeMs: number;
    status: 'pending' | 'verified' | 'rejected';
    excluded: boolean;
};

export type OtherPending = {
    runId: number;
    categoryId: number;
    categoryDisplay: string;
    subcategoryKey: string;
    timeMs: number;
    endedAt: string; // ISO
};

export type RunReview = {
    runId: number;
    arrivedAt: string; // ISO; when the run reached us
    reasons: ReviewReason[]; // open run_flags, newest first; [] when none
    previousPb: number | null; // primary clock, ms
    deltaMs: number | null; // run time - previousPb on the primary clock
    trackRecord: WorklistTrackRecord | null; // null for guests
    pbProgression: PbPoint[]; // this runner, same game/category/subcategory, newest first, max 8, includes this run
    otherPending: OtherPending[]; // this runner's other pending runs on the game, max 10
    modNote: string | null;
    markedForLater: boolean;
};
