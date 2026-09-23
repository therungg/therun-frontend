import type { RunParticipant } from './leaderboards.types';

export type AllRunsPosition = 'board' | 'beaten' | 'held' | 'rejected';
export type AllRunsVerification = 'pending' | 'verified';
/** How the run reached us: LiveSplit sync, a manual entry, or an import. */
export type AllRunsSource = 'livesplit' | 'manual' | 'import';

export interface AllRunsRow {
    id: number;
    runnerName: string;
    userId: number | null;
    isGuest: boolean;
    time: number;
    gameTime: number | null;
    categoryId: number;
    categoryDisplay: string;
    primaryTiming: 'realtime' | 'gametime';
    subcategoryKey: string;
    variables: Record<string, string> | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    position: AllRunsPosition;
    onBoardClock: 'primary' | 'secondary' | null;
    ineligibleReason: string | null;
    hasVideo: boolean;
    sourceKind: AllRunsSource;
    vodUrl: string | null;
    source: string | null;
    arrivedAt: string;
    endedAt: string;
    /** The filer's avatar and ISO country (account runs). */
    picture: string | null;
    country: string | null;
    /** Where the run stands, or would stand, on its board (1 = first). */
    boardRank: number | null;
    /** The runner's best earlier eligible time on the board, board's clock. */
    prevBest: number | null;
    /** Absent on a solo run, never []. */
    participants?: RunParticipant[];
}

export interface AllRunsPage {
    runs: AllRunsRow[];
    total: number;
    page: number;
    pageSize: number;
}

/** Game-wide totals for the built-in views. */
export interface AllRunsViewCounts {
    recent: number;
    pending: number;
    needsVideo: number;
    held: number;
    rejected: number;
}

export interface AllRunsCounts {
    total: number;
    position: Record<AllRunsPosition, number>;
    verification: Record<AllRunsVerification, number>;
    category: Record<string, number>;
    video: { has: number; missing: number };
    source: Record<AllRunsSource, number>;
    /** nameNormalized -> value -> count; '' = not set. */
    vars: Record<string, Record<string, number>>;
}

/** Backend query params, already serialized. `var.<key>` keys included. */
export type AllRunsApiQuery = Record<string, string | number | undefined>;
