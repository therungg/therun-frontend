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
    // Oldest first, max 300. Absent on responses from before the timeline
    // shipped; read a missing one as [].
    timeline?: TimelineEvent[];
};

export type TimelineActor =
    | { kind: 'user'; userId: number; name: string; picture: string | null } // picture null = no avatar
    | {
          kind: 'system';
          name:
              | 'LiveSplit'
              | 'speedrun.com'
              | 'Board rule'
              | 'Auto check'
              | 'therun';
      };

export type TimelineKind =
    | 'arrived'
    | 'src_submitted'
    | 'src_verified'
    | 'src_imported'
    | 'src_linked'
    | 'auto_check'
    | 'flagged'
    | 'flag_resolved'
    | 'reported'
    | 'appealed'
    | 'video_requested'
    | 'video_added'
    | 'video_waived'
    | 'evidence_edited'
    | 'held_submitted'
    | 'verified'
    | 'rejected'
    | 'sent_back'
    | 'restored'
    | 'removed'
    | 're_included'
    | 'moved'
    | 'edited'
    | 'marked'
    | 'unmarked'
    | 'note'
    | 'anonymized'
    | 'other';

export type TimelineEvent = {
    at: string | null; // ISO; null only when an old event's time is unknown
    kind: TimelineKind;
    actor: TimelineActor;
    reason: string | null; // the moderator's reason, report text or appeal text
    data: Record<string, unknown>; // per kind, see the guide's "Kinds" table
    logId?: number; // the moderation-log row, when the event came from one
};
