// Mirror of the backend's speedrun.com import (dry-run) contract —
// therun-backend docs/frontend-guide-src-import.md. Field names match the
// API exactly; keep in sync with `therun/src/src-import/types.ts`.

export type SrcImportStatus = 'queued' | 'running' | 'done' | 'failed';
export type SrcImportPhase = 'meta' | 'runs' | 'matching' | 'done';

export interface SrcImportCheckpoint {
    categoryIndex: number;
    status: 'verified' | 'new';
    offset: number;
    dateFrom?: string;
}

export interface SrcImportJob {
    id: number;
    gameId: number;
    srcGameId: string;
    srcGameAbbreviation: string;
    srcGameName: string;
    srcUrl: string;
    requestedBy: number;
    status: SrcImportStatus;
    phase: SrcImportPhase;
    checkpoint: SrcImportCheckpoint | null;
    categoriesCount: number;
    variablesCount: number;
    runsCount: number;
    playersCount: number;
    playersMatchedCount: number;
    requestsMade: number;
    error: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
}

export interface SrcImportCategory {
    id: number;
    jobId: number;
    srcId: string;
    name: string;
    rules: string | null;
    type: 'per-game' | 'per-level';
    defaultTiming: 'realtime' | 'realtime_noloads' | 'ingame' | null;
    misc: boolean;
    sortOrder: number;
    skipped: boolean;
}

export interface SrcImportVariableValue {
    id: string;
    label: string;
    rules: string | null;
}

export interface SrcImportVariable {
    id: number;
    jobId: number;
    srcId: string;
    srcCategoryId: string | null;
    name: string;
    isSubcategory: boolean;
    values: SrcImportVariableValue[];
    defaultValueId: string | null;
    scope: string;
    skipped: boolean;
}

export type SrcImportMatchKind = 'src_verified' | 'twitch' | 'none';

export interface SrcImportPlayer {
    id: number;
    jobId: number;
    srcUserId: string | null;
    name: string;
    twitchLogin: string | null;
    youtubeUri: string | null;
    twitterUri: string | null;
    country: string | null;
    therunUserId: number | null;
    therunUsername: string | null;
    matchKind: SrcImportMatchKind;
}

export type SrcImportRunPlayer =
    | {
          srcUserId: string;
          /** Staged player's speedrun.com name; null if the player was not staged. */
          name: string | null;
          /** therun.gg username when the player matched, else null. */
          therunUsername: string | null;
      }
    | { guestName: string };

export interface SrcImportRun {
    id: number;
    jobId: number;
    srcRunId: string;
    srcCategoryId: string;
    status: 'verified' | 'new';
    realtimeMs: number | null;
    realtimeNoloadsMs: number | null;
    ingameMs: number | null;
    date: string | null;
    submittedAt: string | null;
    verifiedAt: string | null;
    srcVerifierId: string | null;
    comment: string | null;
    videoUrl: string | null;
    platformName: string | null;
    emulated: boolean;
    region: string | null;
    values: Record<string, string>;
    players: SrcImportRunPlayer[];
    playerCount: number;
}

export interface Paged<T> {
    items: T[];
    total: number;
}
