import type {
    BoardPolicyRow,
    CreatePolicyInput,
    DeletePolicyResult,
    PolicyPreviewInput,
    PolicyPreviewResult,
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

/** A dry run: what a players-policy write at this scope would do to the
 *  category's boards. Writes nothing. */
export function previewPolicy(
    sessionId: string,
    gameId: number,
    input: PolicyPreviewInput,
): Promise<PolicyPreviewResult> {
    return modFetch(`${base(gameId)}/preview`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}
