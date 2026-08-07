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
    summaryOverride: null,
    igdbUrl: null,
    firstReleaseDate: null,
    seriesDisplay: null,
    seriesGames: [],
    genres: [],
    igdbPlatforms: [],
    companies: [],
    links: [],
    rulesTemplate: null,
    gameRules: null,
    emulatorPolicy: null,
    primaryTiming: null,
    hideRealTime: false,
    hideGameTime: false,
    // null, not a value: a failed metadata read must not be mistaken for a
    // board that has stated its defaults, or the setup matrix would draw every
    // category as deviating from a default nobody set.
    sortAscending: null,
    showMilliseconds: null,
};
