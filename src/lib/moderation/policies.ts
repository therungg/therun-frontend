import type {
    BoardPolicyRow,
    CreatePolicyInput,
    DeletePolicyResult,
    UpdatePolicyInput,
} from '../../../types/moderation.types';
import { modFetch } from './mod-fetch';

const base = (gameId: number) => `/v1/leaderboards/games/${gameId}/policies`;

export function listPolicies(
    sessionId: string,
    gameId: number,
    categoryId?: number,
): Promise<BoardPolicyRow[]> {
    return modFetch(base(gameId), { sessionId, query: { categoryId } });
}

export function createPolicy(
    sessionId: string,
    gameId: number,
    input: CreatePolicyInput,
): Promise<BoardPolicyRow> {
    return modFetch(base(gameId), { sessionId, method: 'POST', body: input });
}

export function updatePolicy(
    sessionId: string,
    gameId: number,
    id: number,
    input: UpdatePolicyInput,
): Promise<BoardPolicyRow> {
    return modFetch(`${base(gameId)}/${id}`, {
        sessionId,
        method: 'PUT',
        body: input,
    });
}

export function deletePolicy(
    sessionId: string,
    gameId: number,
    id: number,
): Promise<DeletePolicyResult> {
    return modFetch(`${base(gameId)}/${id}`, {
        sessionId,
        method: 'DELETE',
    });
}
