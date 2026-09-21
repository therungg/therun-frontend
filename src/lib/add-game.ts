import type {
    AddGameResult,
    AddGameSearchResult,
} from '../../types/add-game.types';
import { apiFetch } from './api-client';

export function searchGamesToAdd(
    sessionId: string,
    q: string,
): Promise<AddGameSearchResult[]> {
    return apiFetch<AddGameSearchResult[]>('/v1/games', {
        method: 'POST',
        sessionId,
        body: { op: 'igdb-search', q },
    });
}

export function addGameFromIgdb(
    sessionId: string,
    igdbId: number,
): Promise<AddGameResult> {
    return apiFetch<AddGameResult>('/v1/games', {
        method: 'POST',
        sessionId,
        body: { op: 'add-from-igdb', igdbId },
    });
}

export function requestGame(
    sessionId: string,
    name: string,
    note: string,
): Promise<{ requested: true }> {
    return apiFetch<{ requested: true }>('/v1/games', {
        method: 'POST',
        sessionId,
        body: { op: 'request-game', name, note },
    });
}
