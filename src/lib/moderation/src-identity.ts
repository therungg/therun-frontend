import { meFetch } from './mod-fetch';

/** A runner's speedrun.com link as their board's moderators see it. */
export interface RunnerSrcIdentity {
    username: string;
    srcUserId: string | null;
    srcUsername: string | null;
    srcVerifiedAt: string | null;
    /** False once an identity is set: moving one is an admin's call. */
    editable: boolean;
}

export interface SetSrcIdentityResult {
    username: string;
    srcUserId: string;
    srcUsername: string;
    /** Runs an earlier import parked under the speedrun.com name. */
    claimedRuns: number;
    /** Imported runs folded into ones the runner already had. */
    mergedRuns: number;
    /** False when background syncing is switched off site-wide. */
    syncQueued: boolean;
}

const base = (gameId: number, userId: number) =>
    `/v1/leaderboards/games/${gameId}/runners/${userId}/src-identity`;

export function getRunnerSrcIdentity(
    sessionId: string,
    gameId: number,
    userId: number,
): Promise<RunnerSrcIdentity> {
    return meFetch(base(gameId, userId), { sessionId });
}

export function setRunnerSrcIdentity(
    sessionId: string,
    gameId: number,
    userId: number,
    srcName: string,
): Promise<SetSrcIdentityResult> {
    return meFetch(base(gameId, userId), {
        sessionId,
        method: 'PUT',
        body: { srcName },
    });
}
