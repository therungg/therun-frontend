import type { GameTheme } from '../src/lib/game-theme';
import type {
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

export type HeadlineId =
    | 'firstPlaces'
    | 'podiums'
    | 'boards'
    | 'bestRank'
    | 'hours'
    | 'attempts'
    | 'finishedRuns'
    | 'games'
    | 'pbsThisYear'
    | 'raceRating'
    | 'races'
    | 'currentStreak'
    | 'longestStreak';

export type ProfilePinRef =
    | { kind: 'run'; id: number }
    | { kind: 'manual'; id: number }
    | { kind: 'timerPb'; runId: number };

/** What the runner saved. Every field optional in storage; see resolveProfileLayout. */
export interface ProfileLayout {
    chapters: ChapterId[] | null;
    hiddenChapters: ChapterId[];
    headline: HeadlineId[] | null;
    pins: ProfilePinRef[];
    videoPin: ProfilePinRef | null;
    mainGameId: number | null;
    gameOrder: 'rank' | 'recent' | 'name' | 'manual';
    manualGameIds: number[];
}

/** The layout the page renders: every chapter listed, headline filled, pins checked. */
export interface ResolvedProfileLayout {
    chapters: ChapterId[];
    hiddenChapters: ChapterId[];
    headline: HeadlineId[];
    pins: ProfilePinRef[];
    videoPin: ProfilePinRef | null;
    mainGameId: number | null;
    gameOrder: 'rank' | 'recent' | 'name' | 'manual';
    manualGameIds: number[];
    /** True when the runner never saved a layout (either attribute). */
    isDefault: boolean;
}

export interface HeadlineValue {
    value: number;
    /** Only for bestRank: the board the rank is on. */
    board?: { game: string; gameSlug: string; category: string };
}

export interface TimerPb {
    runId: number;
    gameId: number;
    game: string;
    gameSlug: string;
    imageUrl: string | null;
    theme: GameTheme | null;
    categoryId: number;
    category: string;
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
        runningSince: string | null;
    };
    headline: Record<HeadlineId, HeadlineValue | null>;
    layout: ResolvedProfileLayout;
    chapters: Record<ChapterId, boolean>;
    pins: ResolvedPin[];
    pinsAreAutomatic: boolean;
    mainGame: {
        gameId: number;
        game: string;
        gameSlug: string;
        imageUrl: string | null;
        theme: GameTheme | null;
    } | null;
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
}

export interface RunnerStatsGame {
    gameId: number;
    game: string;
    gameSlug: string;
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
