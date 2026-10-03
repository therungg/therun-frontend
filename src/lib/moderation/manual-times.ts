import type {
    CreateManualTimeInput,
    CreateManualTimeResult,
    ManualTimePreviewInput,
    ManualTimePreviewResult,
} from '../../../types/moderation.types';
import { modFetch } from './mod-fetch';

const base = (gameId: number) =>
    `/v1/leaderboards/games/${gameId}/manual-times`;

export function previewManualTime(
    sessionId: string,
    gameId: number,
    input: ManualTimePreviewInput,
): Promise<ManualTimePreviewResult> {
    return modFetch(`${base(gameId)}/preview`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}

export function createManualTime(
    sessionId: string,
    gameId: number,
    input: CreateManualTimeInput,
): Promise<CreateManualTimeResult> {
    return modFetch(base(gameId), { sessionId, method: 'POST', body: input });
}
