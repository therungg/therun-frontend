import type {
    SelfDeleteManualTimeResult,
    SelfManualTimeInput,
    SelfManualTimeResult,
    SelfRunVerdictInput,
    SelfRunVerdictResult,
} from '../../../types/moderation.types';
import { meFetch } from './mod-fetch';

/** Self-assert a manual time on your own runner (§E1). Trust-gated server-side. */
export function selfCreateManualTime(
    sessionId: string,
    input: SelfManualTimeInput,
): Promise<SelfManualTimeResult> {
    return meFetch('/v1/me/manual-times', {
        sessionId,
        method: 'POST',
        body: input,
    });
}

/** Delete your own manual time (§E2). No reason required. */
export function selfDeleteManualTime(
    sessionId: string,
    id: number,
): Promise<SelfDeleteManualTimeResult> {
    return meFetch(`/v1/me/manual-times/${id}`, {
        sessionId,
        method: 'DELETE',
    });
}

/** Self reject/unreject one of your own finished runs (§E3). */
export function selfRunVerdict(
    sessionId: string,
    runId: number,
    input: SelfRunVerdictInput,
): Promise<SelfRunVerdictResult> {
    return meFetch(`/v1/me/runs/${runId}/verdict`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}
