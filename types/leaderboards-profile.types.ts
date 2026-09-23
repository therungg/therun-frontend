import type { GameTheme } from '../src/lib/game-theme';
import type { MillisecondsMode, RunParticipant } from './leaderboards.types';

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

/** A run or manual time that was the runner's best on this subcategory, since beaten. */
export interface LeaderboardsProfileEarlierPb {
    kind: 'run' | 'manual';
    runId: number | null;
    manualTimeId: number | null;
    /** On the clock the entry itself is shown on. */
    timeMs: number;
    runDate: string | null;
    provenance: ProfileProvenance;
}

export interface LeaderboardsProfileEntry {
    kind: 'run' | 'manual';
    runId: number | null;
    manualTimeId: number | null;
    gameId: number;
    /** `games.name`, what board and run links resolve. Absent on older payloads. */
    gameName?: string;
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
    /** Absent on older backends — derive from `showMilliseconds` then. */
    millisecondsMode?: MillisecondsMode;
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
    /**
     * The OTHER runners credited on this entry — not the whole roster, since
     * this row already belongs to the profile's own owner. Absent means
     * solo; never `[]`. Present on a manual time too (`kind: 'manual'`): a
     * manual time carries a roster of its own (guide §11).
     * Members are ordinary `RunParticipant`s: THE LINK RULE applies (link on
     * `userId != null`, never on `isGuest`), and a roster the backend
     * couldn't read just costs the row its partner line. See guide §9.
     */
    partners?: RunParticipant[];
    /** Earlier PBs on this subcategory, newest first, at most 20. Absent on older backends. */
    earlierPbs?: LeaderboardsProfileEarlierPb[];
    /** The full count; can exceed `earlierPbs.length`. */
    earlierPbCount?: number;
}

export interface LeaderboardsProfileGame {
    gameId: number;
    /** `games.slug`: empty for most games. Link with `gameName`. */
    gameSlug: string;
    /** `games.name`, what board and run links resolve. Absent on older payloads. */
    gameName?: string;
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
    /** `games.name`, what board and run links resolve. Absent on older payloads. */
    gameName?: string;
    game: string;
    category: string;
    /** `categories.name`, the board selector. Absent on older payloads. */
    categorySlug?: string;
    subcategoryKey: string;
    timeMs: number;
    timing: ProfileTiming;
    rank: number | null;
    achievedAt: string;
    /** The OTHER runners credited on this run. Same rules as
     * `LeaderboardsProfileEntry.partners` — see guide §9. */
    partners?: RunParticipant[];
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
    moderates: {
        gameId: number;
        gameSlug: string;
        /** Absent on older payloads. */
        gameName?: string;
        game: string;
    }[];
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
        /** Absent on older payloads. */
        gameName?: string;
        game: string;
        category: string;
        /** Absent on older payloads. */
        categorySlug?: string;
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
    /** Not deployed everywhere yet — read defensively. */
    layout?: ResolvedLeaderboardsLayout;
}

export type PinRef = { kind: 'run' | 'manual'; id: number };

export type GameOrder =
    | 'placement'
    | 'runners'
    | 'rank'
    | 'recent'
    | 'name'
    | 'manual';

/** What the runner saved. */
export interface LeaderboardsLayout {
    mainGameId: number | null;
    pins: PinRef[];
    videoPin: PinRef | null;
    gameOrder: GameOrder;
    manualGameIds: number[];
    showActivity: boolean;
}

/** The saved layout checked by the backend against this payload. */
export interface ResolvedLeaderboardsLayout extends LeaderboardsLayout {
    isDefault: boolean;
}
