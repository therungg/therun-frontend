import type {
    BulkVerdictInput,
    BulkVerdictResult,
    VerdictPreviewInput,
    VerdictPreviewResult,
} from '../../../types/moderation.types';
import { modFetch } from './mod-fetch';

const base = (gameId: number) => `/v1/leaderboards/games/${gameId}/verdicts`;

export function previewVerdicts(
    sessionId: string,
    gameId: number,
    input: VerdictPreviewInput,
): Promise<VerdictPreviewResult> {
    return modFetch(`${base(gameId)}/preview`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}

export function applyVerdicts(
    sessionId: string,
    gameId: number,
    input: BulkVerdictInput,
): Promise<BulkVerdictResult> {
    return modFetch(base(gameId), { sessionId, method: 'POST', body: input });
}
