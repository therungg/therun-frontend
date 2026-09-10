import type { UserData } from '../src/lib/get-session-data';

/**
 * Mirror of the backend's `src/types/user-card.ts`. Served as an opt-in `card`
 * block on GET /users/global/{user}?card=1 — the backend's `api` CFN stack has
 * one resource slot left, so the hover card rides an existing route.
 *
 * Fixed-size on purpose: this is fetched on a mouse-over, so the payload must
 * not grow with how prolific the runner is.
 */
export interface UserCardTopRun {
    game: string;
    gameSlug: string | null;
    category: string;
    /** Real-time PB in ms. Null for a run that has only ever been game-timed. */
    personalBest: number | null;
    playtime: number;
}

export interface UserCardLatestPb {
    game: string;
    gameSlug: string | null;
    category: string;
    time: number;
    achievedAt: string;
}

export interface UserCardStats {
    runCount: number;
    gameCount: number;
    playtime: number;
    attemptCount: number;
    finishedAttemptCount: number;
    topRuns: UserCardTopRun[];
    latestPb: UserCardLatestPb | null;
    /**
     * True when we hold no native run data for this runner and their only
     * presence is a speedrun.com import. The card shows an "imported" note
     * instead of empty/zeroed stats. Absent on older backend deploys.
     */
    imported?: boolean;
    /**
     * speedrun.com display name when the account is linked. The card shows
     * a profile link. Absent on older backend deploys.
     */
    srcUsername?: string | null;
    /** Race record. Null when they have never raced. */
    races?: UserCardRaces | null;
    /** Board placings across every board they rank on. */
    boards?: UserCardBoards | null;
    /** Only when the card was asked for with a game. */
    game?: UserCardGame | null;
}

export interface UserCardRaces {
    rating: number;
    totalRaces: number;
    totalFinishedRaces: number;
    /** 0-100. */
    finishPercentage: number;
}

export interface UserCardBoards {
    first: number;
    /** Includes the #1s. */
    topTen: number;
    total: number;
}

export interface UserCardGameCategory {
    category: string;
    categorySlug: string;
    personalBest: number | null;
    gameTimePb: number | null;
    attemptCount: number;
    playtime: number;
}

export interface UserCardGame {
    gameSlug: string;
    gameDisplay: string;
    attemptCount: number;
    finishedAttemptCount: number;
    /** ms */
    playtime: number;
    lastRunAt: string | null;
    /** At most four. */
    categories: UserCardGameCategory[];
    first: number;
    topTen: number;
}

/**
 * The slice of a live run the card needs, served by /api/users/{user}/live.
 * The full LiveRun carries every split's history and is far too heavy for a
 * hover.
 */
export interface UserCardLive {
    game: string;
    category: string;
    currentSplitIndex: number;
    splitCount: number;
    currentSplitName: string | null;
    startedAt: number | string | null;
    /** ms vs PB at the last completed split; negative is ahead. */
    delta: number | null;
}

export type UserCardProfile = UserData & {
    country?: string | null;
    bio?: string;
    aka?: string;
    card: UserCardStats;
};

/**
 * What the hovered surface already knows about this runner, passed straight in
 * so the card can show it without waiting on the fetch. A leaderboard row has
 * all of this on hand.
 */
export interface UserCardContext {
    rank?: number;
    /** The hovered run's time in ms. Formatted by the card. */
    timeMs?: number;
    /** What the rank is a rank in, e.g. "on this board". */
    label?: string;
    picture?: string | null;
    country?: string | null;
    /** The game the hovered surface is about; the card adds that game's block. */
    gameSlug?: string;
}
