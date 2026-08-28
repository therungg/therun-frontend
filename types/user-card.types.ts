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
}
