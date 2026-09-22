import type { GameTheme } from '../src/lib/game-theme';
import type {
    GameOrder,
    LeaderboardsProfile,
    LeaderboardsProfileEntry,
} from './leaderboards-profile.types';

export type ChapterId =
    | 'highlights'
    | 'leaderboards'
    | 'activity'
    | 'games'
    | 'races'
    | 'splits';

export type StripTab = 'leaderboards' | 'stats' | 'activity' | 'races';

export type ProfilePinRef =
    | { kind: 'run'; id: number }
    | { kind: 'manual'; id: number }
    | { kind: 'timerPb'; runId: number };

/** What the runner saved. Every field optional in storage; see resolveProfileLayout. */
export interface ProfileLayout {
    chapters: ChapterId[] | null;
    hiddenChapters: ChapterId[];
    pins: ProfilePinRef[];
    videoPin: ProfilePinRef | null;
    mainGameId: number | null;
    gameOrder: GameOrder;
    manualGameIds: number[];
}

/** The layout the page renders: every chapter listed, pins checked. */
export interface ResolvedProfileLayout {
    chapters: ChapterId[];
    hiddenChapters: ChapterId[];
    pins: ProfilePinRef[];
    videoPin: ProfilePinRef | null;
    mainGameId: number | null;
    gameOrder: GameOrder;
    manualGameIds: number[];
    /** True when the runner never saved a layout (either attribute). */
    isDefault: boolean;
}

export interface TimerPb {
    runId: number;
    gameId: number;
    game: string;
    gameSlug: string;
    /** `games.name`, what board and run links resolve. Absent on older payloads. */
    gameName?: string;
    imageUrl: string | null;
    theme: GameTheme | null;
    categoryId: number;
    category: string;
    /** `categories.name`, the board selector. Absent on older payloads. */
    categorySlug?: string;
    /** The run's Dynamo key; its segments past game#category qualify the run page URL. Absent on older payloads. */
    runKey?: string;
    /** What tells two runs on one category apart, e.g. "Luigi · Switch 2". Absent on older payloads. */
    subcategory?: string | null;
    personalBestMs: number | null;
    sumOfBestsMs: number | null;
    hasGameTime: boolean;
    gameTimePbMs: number | null;
    gameTimeSobMs: number | null;
    attempts: number;
    finishedAttempts: number;
    playtimeMs: number;
    personalBestAt: string | null;
    uploadedAt: string | null;
    vodUrl: string | null;
}

export type ResolvedPin =
    | {
          ref: { kind: 'run' | 'manual'; id: number };
          type: 'board';
          entry: LeaderboardsProfileEntry;
          game: {
              gameId: number;
              game: string;
              gameSlug: string;
              /** Absent on older payloads. */
              gameName?: string;
              imageUrl: string | null;
          };
      }
    | {
          ref: { kind: 'timerPb'; runId: number };
          type: 'timerPb';
          timer: TimerPb;
      };

export interface RunnerProfileHead {
    runner: LeaderboardsProfile['runner'] & {
        guest: boolean;
        timezone: string | null;
        /** Another name the runner goes by; absent on older payloads. */
        aka?: string | null;
        runningSince: string | null;
    };
    layout: ResolvedProfileLayout;
    /** Stat strip tiles per tab; null = defaults. Absent on older payloads. */
    strips?: Record<StripTab, string[] | null>;
    /** The runner's resolved profile theme (own, main game's, or none). Absent on older payloads. */
    theme?: GameTheme | null;
    chapters: Record<ChapterId, boolean>;
    pins: ResolvedPin[];
    pinsAreAutomatic: boolean;
    mainGame: {
        gameId: number;
        game: string;
        gameSlug: string;
        /** Absent on older payloads. */
        gameName?: string;
        imageUrl: string | null;
        theme: GameTheme | null;
    } | null;
    /** True while a rename's Dynamo items, splits, search entry and race
     * memberships are still being moved to the new name in the background.
     * Absent on older payloads. */
    usernameChangePending?: boolean;
    /** The name that rename is moving FROM, so the notice can name it. Null
     * or absent whenever nothing is in flight. */
    usernameChangeFrom?: string | null;
}

export interface RunnerActivity {
    days: { date: string; attempts: number; playtimeMs: number }[];
    streaks: {
        current: number;
        currentStart: string | null;
        longest: number;
        longestStart: string | null;
        longestEnd: string | null;
    };
    hoursThisYear: number;
    /** Local hours [startHour, endHour) in the runner's timezone; endHour wraps past 24. */
    usualHours: { startHour: number; endHour: number; share: number } | null;
}

export interface RunnerStatsCategory extends TimerPb {
    bestRank: number | null;
    /** The runner starred this run. Absent on older payloads — treat as false. */
    highlighted?: boolean;
}

export interface RunnerStatsGame {
    gameId: number;
    game: string;
    gameSlug: string;
    /** `games.name`, what board and run links resolve. Absent on older payloads. */
    gameName?: string;
    imageUrl: string | null;
    playtimeMs: number;
    attempts: number;
    finishedAttempts: number;
    bestRank: number | null;
    categories: RunnerStatsCategory[];
}

export interface RunnerStats {
    games: RunnerStatsGame[];
    totals: {
        playtimeMs: number;
        attempts: number;
        finishedAttempts: number;
        games: number;
        categories: number;
    };
}
