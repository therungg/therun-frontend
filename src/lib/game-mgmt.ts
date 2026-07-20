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

export interface GameCompanyMeta {
    name: string;
    isDeveloper: boolean;
    isPublisher: boolean;
}

export interface GameIgdbPlatformMeta {
    name: string;
    abbreviation: string | null;
}

export interface GameMetadata {
    coverUrl: string | null;
    platforms: string[];
    releaseYear: number | null;
    discordUrl: string | null;
    configured: boolean;
    summary: string | null;
    firstReleaseDate: string | null;
    seriesDisplay: string | null;
    genres: string[];
    igdbPlatforms: GameIgdbPlatformMeta[];
    companies: GameCompanyMeta[];
}

interface GameMetadataPageData {
    game?: {
        coverUrl?: string | null;
        platforms?: string[] | null;
        releaseYear?: number | null;
        discordUrl?: string | null;
        configured?: boolean | null;
        summary?: string | null;
        firstReleaseDate?: string | null;
        seriesDisplay?: string | null;
    };
    metadata?: {
        genres?: string[] | null;
        platforms?:
            | { name?: string | null; abbreviation?: string | null }[]
            | null;
        companies?:
            | {
                  name?: string | null;
                  isDeveloper?: boolean | null;
                  isPublisher?: boolean | null;
              }[]
            | null;
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
        // || not ??: unsynced prod rows carry "" and empty must read as absent.
        summary: data?.game?.summary || null,
        firstReleaseDate: data?.game?.firstReleaseDate ?? null,
        seriesDisplay: data?.game?.seriesDisplay ?? null,
        genres: (data?.metadata?.genres ?? []).filter(
            (g): g is string => typeof g === 'string' && g.length > 0,
        ),
        igdbPlatforms: (data?.metadata?.platforms ?? []).flatMap((p) =>
            p?.name
                ? [{ name: p.name, abbreviation: p.abbreviation ?? null }]
                : [],
        ),
        companies: (data?.metadata?.companies ?? []).flatMap((c) =>
            c?.name
                ? [
                      {
                          name: c.name,
                          isDeveloper: c.isDeveloper ?? false,
                          isPublisher: c.isPublisher ?? false,
                      },
                  ]
                : [],
        ),
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
