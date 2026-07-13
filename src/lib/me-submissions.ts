import type {
    SubmitRunInput,
    SubmitRunResult,
} from '../../types/leaderboards.types';
import { meFetch } from './moderation/mod-fetch';

/** Submit a run for a game/category you don't have a live timer feed for. */
export function submitRun(
    sessionId: string,
    input: SubmitRunInput,
): Promise<SubmitRunResult> {
    return meFetch('/v1/me/submissions', {
        sessionId,
        method: 'POST',
        body: input,
    });
}
