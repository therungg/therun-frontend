import type { GameTheme } from '../src/lib/game-theme';

export type ProfileProvenance =
    | 'live'
    | 'submitted'
    | 'mod'
    | 'self'
    | 'splits'
    | 'imported'
    | 'unknown';
export type ProfileTiming = 'realtime' | 'gametime';
export type ProfileStatus = 'verified' | 'pending' | 'rejected';

export interface LeaderboardsProfileEntry {
    kind: 'run' | 'manual';
    runId: number | null;
    manualTimeId: number | null;
    gameId: number;
    categoryId: number;
    category: string;
    categorySlug: string;
    level: string | null;
    subcategoryKey: string;
    variables: Record<string, string>;
    timeMs: number;
    timing: ProfileTiming;
    gameTimeLabel: string;
    showMilliseconds: boolean;
    archived: boolean;
    rank: number | null;
    totalRunners: number | null;
    countryRank: number | null;
    countryRunners: number | null;
    runDate: string | null;
    provenance: ProfileProvenance;
    status: ProfileStatus;
    verifiedAt: string | null;
    platform: string | null;
    emulator: boolean;
    region: string | null;
    vodUrl: string | null;
    hasSplits: boolean;
    splitsHref: string | null;
    /** Attempts on the timer run behind this entry; null without one. */
    attempts: number | null;
    /** Successive PBs on this board, oldest first. */
    pbHistory: { date: string; timeMs: number }[];
}

export interface LeaderboardsProfileGame {
    gameId: number;
    gameSlug: string;
    game: string;
    imageUrl: string | null;
    theme: GameTheme | null;
    bestRank: number | null;
    lastRanAt: string | null;
    attempts: number | null;
    playtimeMs: number | null;
    entries: LeaderboardsProfileEntry[];
    archived: LeaderboardsProfileEntry[];
}

export interface LeaderboardsProfileRecentPb {
    runId: number;
    gameSlug: string;
    game: string;
    category: string;
    subcategoryKey: string;
    timeMs: number;
    timing: ProfileTiming;
    rank: number | null;
    achievedAt: string;
}

export interface LeaderboardsProfileRunner {
    name: string;
    userId: number | null;
    deleted: boolean;
    picture: string | null;
    pronouns: string | null;
    country: string | null;
    bio: string | null;
    socials: Record<string, string>;
    patron: boolean;
    moderates: { gameId: number; gameSlug: string; game: string }[];
    joinedAt: string | null;
    firstBoardRunAt: string | null;
    importLinked: boolean;
}

export interface LeaderboardsProfileStanding {
    boards: number;
    first: number;
    podiums: number;
    topTen: number;
    best: {
        rank: number;
        gameSlug: string;
        game: string;
        category: string;
        subcategoryKey: string;
    } | null;
    verified: number;
    pending: number;
    races: { count: number; finishPercentage: number } | null;
}

export interface LeaderboardsProfile {
    runner: LeaderboardsProfileRunner;
    standing: LeaderboardsProfileStanding;
    activity: { date: string; attempts: number }[];
    games: LeaderboardsProfileGame[];
    recentPbs: LeaderboardsProfileRecentPb[];
}
