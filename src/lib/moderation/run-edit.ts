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
