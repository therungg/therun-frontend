import type {
    CreateManualTimeInput,
    CreateManualTimeResult,
    DeleteManualTimeResult,
    ManualTimeFilter,
    ManualTimePreviewInput,
    ManualTimePreviewResult,
    ManualTimeRow,
    ManualTimeVerdictInput,
    ManualTimeVerdictResult,
    UpdateManualTimeInput,
    UpdateManualTimeResult,
} from '../../../types/moderation.types';
import { modFetch } from './mod-fetch';

const base = (gameId: number) =>
    `/v1/leaderboards/games/${gameId}/manual-times`;

export function listManualTimes(
    sessionId: string,
    gameId: number,
    filter?: ManualTimeFilter,
): Promise<ManualTimeRow[]> {
    return modFetch(base(gameId), {
        sessionId,
        query: filter ? { ...filter } : undefined,
    });
}

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

export function manualTimeVerdict(
    sessionId: string,
    gameId: number,
    id: number,
    input: ManualTimeVerdictInput,
): Promise<ManualTimeVerdictResult> {
    return modFetch(`${base(gameId)}/${id}/verdict`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}

export function updateManualTime(
    sessionId: string,
    gameId: number,
    id: number,
    input: UpdateManualTimeInput,
): Promise<UpdateManualTimeResult> {
    return modFetch(`${base(gameId)}/${id}`, {
        sessionId,
        method: 'PUT',
        body: input,
    });
}

export function deleteManualTime(
    sessionId: string,
    gameId: number,
    id: number,
    reason: string,
): Promise<DeleteManualTimeResult> {
    return modFetch(`${base(gameId)}/${id}`, {
        sessionId,
        method: 'DELETE',
        body: { reason },
    });
}
