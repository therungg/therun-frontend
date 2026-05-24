import type {
    AppealInput,
    AppealResult,
    HistoryEvent,
} from '../../../types/moderation.types';
import { meFetch } from './mod-fetch';

/** Public run history timeline (§G1). No auth required. */
export function getRunHistory(
    runId: number,
    sessionId?: string,
): Promise<HistoryEvent[]> {
    return meFetch(`/v1/runs/${runId}/history`, { sessionId });
}

/** Appeal a verdict on your own run (§G2). Owner-only. */
export function appealRun(
    sessionId: string,
    runId: number,
    input: AppealInput,
): Promise<AppealResult> {
    return meFetch(`/v1/runs/${runId}/appeal`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}
