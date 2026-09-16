import type {
    PbSubmissionForm,
    PbSubmissionInput,
    WaitingRun,
} from '../../types/pb-submission.types';
import { meFetch } from './moderation/mod-fetch';

/**
 * Runs a board is holding for their runner. Not a moderation surface despite
 * the shared fetcher — these are the runner's own runs, and `/v1/me/*` is where
 * they live.
 */
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

/** Both kinds of run waiting on this runner: held PBs and runs that need a video. */
export function listWaitingOnRunner(sessionId?: string): Promise<WaitingRun[]> {
    return meFetch<WaitingRun[]>('/v1/me/pb-submissions', {
        sessionId,
        query: { include: 'video' },
    });
}
