import type { UserEligibleRunRow } from '../../../../../types/moderation.types';
import type { TimingKey } from './timing-columns';

/**
 * What the inspector needs to answer "is this time plausible?" — derived
 * entirely from the runner's eligible-runs read, which the drawer already
 * fetches. No extra round trip.
 *
 * Caveat worth knowing before trusting `boardCount`: the backend's
 * eligible-runs query filters out rejected and excluded runs
 * (get-user-eligible-runs.ts), so nothing here can speak to a runner's prior
 * rejections. Don't add a "prior rejections" readout off these rows — it
 * would render 0 for everyone.
 */
export interface RunBoardContext {
    /** Live rank of this run on its board, from the leaderboard cache. */
    rank: number | null;
    totalRunners: number | null;
    /** Best time this runner set on this board BEFORE this run. */
    previousBestMs: number | null;
    /** thisTime − previousBest. Negative = this run is an improvement. */
    deltaMs: number | null;
    /** How many earlier runs the runner has on this board. */
    previousRunCount: number;
    /** Boards in this game the runner currently holds a slot on. */
    boardCount: number;
}

export interface RunBoardContextInput {
    runId: number;
    /** Rows carry `categories.display`, not the slug — match on display. */
    categoryDisplay: string;
    subcategoryKey: string;
    timing: TimingKey;
    /** The inspected run's time on this board's clock. */
    timeMs: number | null;
    /** The inspected run's date, ISO. Bounds "previous" to actually-earlier. */
    runDate: string | null;
}

/** A row's time on the given board's clock, with the RTA fallback a
 * game-time board applies to runs that never reported a game time. */
function boardTime(row: UserEligibleRunRow, timing: TimingKey): number | null {
    return timing === 'gt' ? (row.gameTime ?? row.time) : row.time;
}

export function runBoardContext(
    rows: UserEligibleRunRow[] | null,
    input: RunBoardContextInput,
): RunBoardContext {
    const empty: RunBoardContext = {
        rank: null,
        totalRunners: null,
        previousBestMs: null,
        deltaMs: null,
        previousRunCount: 0,
        boardCount: 0,
    };
    if (rows == null) return empty;

    const self = rows.find((r) => r.runId === input.runId) ?? null;
    const cutoff =
        input.runDate != null ? new Date(input.runDate).getTime() : null;

    const earlier = rows.filter((r) => {
        if (r.runId === input.runId) return false;
        if (r.categoryName !== input.categoryDisplay) return false;
        if (r.subcategoryKey !== input.subcategoryKey) return false;
        if (boardTime(r, input.timing) == null) return false;
        // With no date on the inspected run, every other run on the board
        // counts — better a slightly loose comparison than none.
        if (cutoff == null || Number.isNaN(cutoff)) return true;
        return new Date(r.endedAt).getTime() < cutoff;
    });

    const previousBestMs = earlier.length
        ? Math.min(...earlier.map((r) => boardTime(r, input.timing) as number))
        : null;

    return {
        rank: self?.rank ?? null,
        totalRunners: self?.totalRunners ?? null,
        previousBestMs,
        deltaMs:
            previousBestMs != null && input.timeMs != null
                ? input.timeMs - previousBestMs
                : null,
        previousRunCount: earlier.length,
        boardCount: rows.filter(
            (r) => r.isLeaderboardEntry || r.isLeaderboardEntryGt,
        ).length,
    };
}

/**
 * How far outside the runner's own history this run sits, as a share of their
 * previous best. Only an improvement can be suspicious here — a slower run
 * needs no explanation. Returns null when there's nothing to compare against.
 */
export function improvementShare(ctx: RunBoardContext): number | null {
    if (ctx.previousBestMs == null || ctx.deltaMs == null) return null;
    if (ctx.deltaMs >= 0) return null;
    return -ctx.deltaMs / ctx.previousBestMs;
}

/** An improvement this large over the runner's own PB is worth a second
 * look before verifying. Not an accusation — a prompt. */
export const OUTLIER_IMPROVEMENT_SHARE = 0.15;

export function isOutlierImprovement(ctx: RunBoardContext): boolean {
    const share = improvementShare(ctx);
    return share != null && share >= OUTLIER_IMPROVEMENT_SHARE;
}
