import { meFetch } from './mod-fetch';

/**
 * Fields `PUT /v1/leaderboards/runs/{runId}` accepts. Presence is what counts
 * server-side (`"vodUrl" in body`), so only send what's actually changing —
 * an explicit `null` clears the field, `undefined` leaves it alone.
 */
export interface EditRunInput {
    time?: number;
    gameTime?: number;
    vodUrl?: string | null;
    modNote?: string;
    variables?: Record<string, string>;
    platform?: string;
    emulator?: boolean;
    leaderboardEligible?: boolean;
    /**
     * A moderator may only clear a description (`null`). Writing text is
     * rejected unless the run is a guest row, which has no owner to speak for
     * itself — see `writeGuestDescription` below.
     */
    description?: string | null;
    /**
     * Revoke or restore the runner's ability to write descriptions on this
     * run's category. Sent alone; it touches no field on the run itself.
     */
    descriptionRestriction?: 'revoke' | 'restore';
    /** Mandatory, min 10 characters — the endpoint 400s without it. */
    reason: string;
}

/** Edit a single run as a moderator. Writes a mod-log + audit-log row. */
export function editRun(
    sessionId: string,
    runId: number,
    input: EditRunInput,
): Promise<{ updated: boolean }> {
    return meFetch(`/v1/leaderboards/runs/${runId}`, {
        sessionId,
        method: 'PUT',
        body: input,
    });
}

/**
 * Write (or clear, with `null`) the description on a run you own. Same endpoint
 * as `editRun`, but the backend takes the owner branch — no moderator
 * permission and no reason — precisely because `description` is the only field
 * in the body. Don't add fields here; doing so silently turns the call into a
 * moderator edit that a runner can't make.
 */
export function setOwnDescription(
    sessionId: string,
    runId: number,
    description: string | null,
): Promise<{ updated: boolean }> {
    return meFetch(`/v1/leaderboards/runs/${runId}`, {
        sessionId,
        method: 'PUT',
        body: { description },
    });
}
