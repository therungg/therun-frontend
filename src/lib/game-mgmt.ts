'use server';

import { cacheLife, cacheTag } from 'next/cache';
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
    coverUrl?: string | null;
    platforms?: string[];
    releaseYear?: number | null;
    discordUrl?: string | null;
    configured?: boolean;
}

export interface GameMetadata {
    coverUrl: string | null;
    platforms: string[];
    releaseYear: number | null;
    discordUrl: string | null;
    configured: boolean;
}

interface GameMetadataPageData {
    game?: {
        coverUrl?: string | null;
        platforms?: string[] | null;
        releaseYear?: number | null;
        discordUrl?: string | null;
        configured?: boolean | null;
    };
}

export async function getGameMetadata(gameId: number): Promise<GameMetadata> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`game-meta:${gameId}`);

    const data = await apiFetch<GameMetadataPageData | undefined>(
        `/v1/games/${gameId}`,
    );
    return {
        coverUrl: data?.game?.coverUrl ?? null,
        platforms: data?.game?.platforms ?? [],
        releaseYear: data?.game?.releaseYear ?? null,
        discordUrl: data?.game?.discordUrl ?? null,
        configured: data?.game?.configured ?? false,
    };
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
