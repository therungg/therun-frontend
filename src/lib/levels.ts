'use server';

import { apiFetch } from './api-client';

/**
 * A level is a category in the game's level group. Everything about one —
 * creating, archiving, its subcategories and filters — is the ordinary
 * category and variable API; only the group itself needs a call.
 */

/** The game's levels section, created on first use. Idempotent. */
export async function ensureLevelGroup(
    sessionId: string,
    gameId: number,
): Promise<{ id: number }> {
    return apiFetch<{ id: number }>(`/v1/games/${gameId}/groups`, {
        method: 'POST',
        sessionId,
        body: { kind: 'level' },
    });
}
