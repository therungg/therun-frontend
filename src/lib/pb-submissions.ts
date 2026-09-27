import type {
    PbSubmissionForm,
    PbSubmissionInput,
} from '../../types/pb-submission.types';
import type {
    SubmissionItem,
    SubmissionsOverview,
} from '../../types/runner-status.types';
import { meFetch } from './moderation/mod-fetch';

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
