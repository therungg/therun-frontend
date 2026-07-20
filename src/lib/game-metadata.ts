import type { GameMetadata } from './game-mgmt';

// Lives outside game-mgmt.ts because that file is 'use server', which only
// allows async-function value exports — a plain const object there is a
// Next.js runtime error.
/** Render-degrades-gracefully fallback when /v1/games/:id fails or pageData is null. */
export const EMPTY_GAME_METADATA: GameMetadata = {
    coverUrl: null,
    platforms: [],
    releaseYear: null,
    discordUrl: null,
    configured: false,
    summary: null,
    firstReleaseDate: null,
    seriesDisplay: null,
    genres: [],
    igdbPlatforms: [],
    companies: [],
};
