'use server';

import type {
    BoardClaimRequest,
    BoardModRole,
} from '../../types/board-claims.types';
import { ApiError, apiFetch } from './api-client';

export async function submitBoardClaim(
    sessionId: string,
    gameId: number,
    motivation: string,
): Promise<{ id: number }> {
    return apiFetch<{ id: number }>('/v1/board-claims', {
        method: 'POST',
        sessionId,
        body: { gameId, motivation },
    });
}

export async function getMyBoardClaim(
    sessionId: string,
    gameId: number,
): Promise<BoardClaimRequest | null> {
    try {
        const result = await apiFetch<BoardClaimRequest | null>(
            `/v1/board-claims/mine?gameId=${gameId}`,
            { sessionId },
        );
        return result ?? null;
    } catch (e) {
        // Endpoint not deployed yet (404) must not break the game page.
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
    }
}

export async function listPendingBoardClaims(
    sessionId: string,
): Promise<BoardClaimRequest[]> {
    try {
        const result = await apiFetch<BoardClaimRequest[]>(
            '/v1/board-claims?status=pending',
            { sessionId },
        );
        return result ?? [];
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return [];
        throw e;
    }
}

export async function listGameBoardClaims(
    sessionId: string,
    gameId: number,
): Promise<BoardClaimRequest[]> {
    try {
        const result = await apiFetch<BoardClaimRequest[]>(
            `/v1/board-claims?status=pending&gameId=${gameId}`,
            { sessionId },
        );
        return result ?? [];
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return [];
        throw e;
    }
}

export async function approveBoardClaim(
    sessionId: string,
    claimId: number,
    role: BoardModRole,
): Promise<{ approved: boolean }> {
    return apiFetch<{ approved: boolean }>(
        `/v1/board-claims/${claimId}/approve`,
        { method: 'POST', sessionId, body: { role } },
    );
}

export async function denyBoardClaim(
    sessionId: string,
    claimId: number,
    reason?: string,
): Promise<{ denied: boolean }> {
    return apiFetch<{ denied: boolean }>(`/v1/board-claims/${claimId}/deny`, {
        method: 'POST',
        sessionId,
        body: { reason: reason ?? null },
    });
}
