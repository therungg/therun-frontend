import type {
    HeldPb,
    OffBoardRow,
    PbSubmissionForm,
    PbSubmissionInput,
} from '../../types/pb-submission.types';
import type {
    SubmissionItem,
    SubmissionsOverview,
} from '../../types/runner-status.types';
import { meFetch } from './moderation/mod-fetch';

/**
 * PBs a board is holding until their runner submits them. Not a moderation
 * surface despite the shared fetcher — these are the runner's own runs, and
 * `/v1/me/*` is where they live.
 */
export function listHeldPbs(sessionId?: string): Promise<HeldPb[]> {
    return meFetch<HeldPb[]>('/v1/me/pb-submissions', { sessionId });
}

/**
 * This runner's own runs a board baseline took off for carrying no
 * speedrun.com evidence. `include=video,off-board` is a different query
 * string from the bare call above — it's the only combination the backend
 * reshapes the response for (`{ runs, offBoard }` instead of a flat array),
 * so this does not touch or change what `listHeldPbs` returns. The `runs`
 * half of that response is the needs-video / held list another branch owns;
 * this only reads `offBoard`.
 */
export async function listOffBoardForRunner(
    sessionId?: string,
): Promise<OffBoardRow[]> {
    const res = await meFetch<{ offBoard: OffBoardRow[] }>(
        '/v1/me/pb-submissions',
        { sessionId, query: { include: 'video,off-board' } },
    );
    // A backend that doesn't know this include yet answers with the flat array
    // the bare call returns, and `offBoard` is undefined. That's an empty
    // section, not a crash that takes the held-PB list down with it.
    return res.offBoard ?? [];
}

export function getPbSubmission(
    runId: number,
    sessionId?: string,
): Promise<PbSubmissionForm> {
    return meFetch<PbSubmissionForm>(`/v1/me/pb-submissions/${runId}`, {
        sessionId,
    });
}

export function submitPb(
    runId: number,
    input: PbSubmissionInput,
    sessionId?: string,
): Promise<{ runId: number; submitted: boolean }> {
    return meFetch(`/v1/me/pb-submissions/${runId}`, {
        method: 'POST',
        body: input,
        sessionId,
    });
}

/**
 * Everything the Submissions/Leaderboards tab shows for one runner: what
 * needs them, and the rest of what the public profile can show plus what's
 * still actionable. Per-viewer and session-bound (auth decides `scope`), so
 * unlike the reads above this is never `'use cache'`.
 */
export function getRunnerSubmissions(
    username: string,
    sessionId: string,
): Promise<SubmissionsOverview> {
    return meFetch<SubmissionsOverview>('/v1/me/runner-submissions', {
        sessionId,
        query: { username },
    });
}

/**
 * Pages through one runner's finished runs on one board slice — the rest of
 * their history that `getRunnerSubmissions` doesn't already carry. `page` is
 * 0-based, mirroring the backend.
 */
export function getRunnerCategoryRuns(
    username: string,
    categoryId: number,
    subcategoryKey: string,
    page: number,
    sessionId: string,
): Promise<{ items: SubmissionItem[]; page: number; hasMore: boolean }> {
    return meFetch<{ items: SubmissionItem[]; page: number; hasMore: boolean }>(
        '/v1/me/runner-submissions/runs',
        {
            sessionId,
            query: { username, categoryId, subcategoryKey, page },
        },
    );
}
