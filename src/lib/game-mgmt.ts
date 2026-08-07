'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { apiFetch } from './api-client';

export interface GameLink {
    label: string;
    url: string;
}

export interface GameIdentifiers {
    slug: string | null;
}

interface GamePageData {
    game?: {
        slug?: string | null;
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
    };
}

export interface UpdateGameBody {
    slug?: string | null;
    coverUrl?: string | null;
    summaryOverride?: string | null;
    platforms?: string[];
    releaseYear?: number | null;
    discordUrl?: string | null;
    configured?: boolean;
    links?: GameLink[];
    primaryTiming?: 'rt' | 'gt';
    rulesTemplate?: string | null;
    gameRules?: string | null;
    emulatorPolicy?: 'allowed' | 'banned' | null;
    hideRealTime?: boolean;
    hideGameTime?: boolean;
    /** Board defaults for ranking direction / precision. Stamped onto
     *  categories by the wizard, never resolved through — see GameMetadata. */
    sortAscending?: boolean | null;
    showMilliseconds?: boolean | null;
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

/** A sibling game in the same series — pageData.seriesGames (backend handoff). */
export interface GameSeriesSibling {
    slug: string;
    display: string;
    coverUrl: string | null;
    sortOrderInSeries: number | null;
}

export interface GameMetadata {
    coverUrl: string | null;
    platforms: string[];
    releaseYear: number | null;
    discordUrl: string | null;
    configured: boolean;
    summary: string | null;
    /** Mod-set description; beats `summary` (IGDB) on display. */
    summaryOverride: string | null;
    igdbUrl: string | null;
    firstReleaseDate: string | null;
    seriesDisplay: string | null;
    /**
     * Other games in the same series. Empty until the backend starts baking
     * `seriesGames` into pageData — the Series panel renders nothing until
     * then (see docs/plans/2026-08-07-game-page-stats-plan.md, handoff #2).
     */
    seriesGames: GameSeriesSibling[];
    genres: string[];
    igdbPlatforms: GameIgdbPlatformMeta[];
    companies: GameCompanyMeta[];
    links: GameLink[];
    rulesTemplate: string | null;
    gameRules: string | null;
    emulatorPolicy: 'allowed' | 'banned' | null;
    primaryTiming: 'rt' | 'gt' | null;
    hideRealTime: boolean;
    hideGameTime: boolean;
    /**
     * Board defaults for ranking direction and time precision, the twins of
     * the identically-named per-category columns.
     *
     * Like `primaryTiming`, these are stamped onto categories by the setup
     * wizard and are NOT resolved through at read time — a category always
     * carries its own concrete value. That is deliberate: changing a board
     * default here must never silently reorder every existing leaderboard.
     * NULL = the board has no stated default.
     */
    sortAscending: boolean | null;
    showMilliseconds: boolean | null;
}

interface GameMetadataPageData {
    game?: {
        coverUrl?: string | null;
        platforms?: string[] | null;
        releaseYear?: number | null;
        discordUrl?: string | null;
        configured?: boolean | null;
        summary?: string | null;
        summaryOverride?: string | null;
        igdbUrl?: string | null;
        firstReleaseDate?: string | null;
        seriesDisplay?: string | null;
        links?: GameLink[] | null;
        rulesTemplate?: string | null;
        gameRules?: string | null;
        emulatorPolicy?: string | null;
        primaryTiming?: string | null;
        hideRealTime?: boolean | null;
        hideGameTime?: boolean | null;
        sortAscending?: boolean | null;
        showMilliseconds?: boolean | null;
    };
    seriesGames?:
        | {
              slug?: string | null;
              display?: string | null;
              coverUrl?: string | null;
              sortOrderInSeries?: number | null;
          }[]
        | null;
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
        summaryOverride: data?.game?.summaryOverride || null,
        igdbUrl: data?.game?.igdbUrl || null,
        firstReleaseDate: data?.game?.firstReleaseDate ?? null,
        seriesDisplay: data?.game?.seriesDisplay ?? null,
        seriesGames: (data?.seriesGames ?? []).flatMap((g) =>
            g?.slug && g.display
                ? [
                      {
                          slug: g.slug,
                          display: g.display,
                          coverUrl: g.coverUrl ?? null,
                          sortOrderInSeries: g.sortOrderInSeries ?? null,
                      },
                  ]
                : [],
        ),
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
        links: data?.game?.links ?? [],
        rulesTemplate: data?.game?.rulesTemplate ?? null,
        gameRules: data?.game?.gameRules ?? null,
        emulatorPolicy:
            (data?.game?.emulatorPolicy as
                | 'allowed'
                | 'banned'
                | null
                | undefined) ?? null,
        primaryTiming:
            data?.game?.primaryTiming === 'gt'
                ? 'gt'
                : data?.game?.primaryTiming === 'rt'
                  ? 'rt'
                  : null,
        hideRealTime: data?.game?.hideRealTime ?? false,
        hideGameTime: data?.game?.hideGameTime ?? false,
        // ?? null, not ?? a default: "no stated board default" is a real
        // state the matrix renders differently from "defaults to true".
        sortAscending: data?.game?.sortAscending ?? null,
        showMilliseconds: data?.game?.showMilliseconds ?? null,
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

export interface IgdbSearchResult {
    id: number;
    name: string;
    cover?: { id: number; url: string };
}

export async function igdbSearchGames(
    sessionId: string,
    gameId: number,
    query: string,
): Promise<IgdbSearchResult[]> {
    return apiFetch<IgdbSearchResult[]>(
        `/v1/games/${gameId}/igdb-search?q=${encodeURIComponent(query)}`,
        { sessionId },
    );
}

export async function igdbSyncGame(
    sessionId: string,
    gameId: number,
    igdbId: number,
): Promise<{ synced: boolean; igdbId: number; igdbName: string }> {
    return apiFetch<{ synced: boolean; igdbId: number; igdbName: string }>(
        `/v1/games/${gameId}/igdb-sync`,
        { method: 'POST', sessionId, body: { igdbId } },
    );
}
