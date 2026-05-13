'use server';

import { apiFetch } from './api-client';

export interface GameIdentifiers {
    slug: string | null;
    abbreviation: string | null;
}

interface GamePageData {
    game?: {
        slug?: string | null;
        abbreviation?: string | null;
    };
}

export async function getGameIdentifiers(
    gameId: number,
): Promise<GameIdentifiers> {
    const data = await apiFetch<GamePageData | undefined>(
        `/v1/games/${gameId}`,
    );
    return {
        slug: data?.game?.slug ?? null,
        abbreviation: data?.game?.abbreviation ?? null,
    };
}

export interface UpdateGameBody {
    slug?: string | null;
    abbreviation?: string | null;
}

export async function updateGame(
    sessionId: string,
    gameId: number,
    body: UpdateGameBody,
): Promise<{ updated: boolean }> {
    return apiFetch<{ updated: boolean }>(`/v1/games/${gameId}`, {
        method: 'PUT',
        sessionId,
        body,
    });
}
