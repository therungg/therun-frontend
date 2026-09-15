import type {
    HeldPb,
    PbSubmissionForm,
    PbSubmissionInput,
} from '../../types/pb-submission.types';
import { meFetch } from './moderation/mod-fetch';

/**
 * PBs a board is holding until their runner submits them. Not a moderation
 * surface despite the shared fetcher — these are the runner's own runs, and
 * `/v1/me/*` is where they live.
 */
export function listHeldPbs(sessionId?: string): Promise<HeldPb[]> {
    return meFetch<HeldPb[]>('/v1/me/pb-submissions', { sessionId });
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
