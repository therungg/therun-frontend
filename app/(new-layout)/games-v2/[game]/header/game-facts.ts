import type { GameCompanyMeta, GameIgdbPlatformMeta } from '~src/lib/game-mgmt';

// Header facts derivation: moderator-set values always beat IGDB values,
// and every helper returns null for "hide this fact" (spec §1).

const PLATFORM_CAP = 4;
const GENRE_CAP = 3;

export function deriveReleaseYear(
    modYear: number | null,
    firstReleaseDate: string | null,
): string | null {
    if (modYear != null) return String(modYear);
    if (!firstReleaseDate) return null;
    const year = new Date(firstReleaseDate).getUTCFullYear();
    return Number.isFinite(year) ? String(year) : null;
}

export function derivePlatforms(
    modPlatforms: string[],
    igdbPlatforms: GameIgdbPlatformMeta[],
): string | null {
    if (modPlatforms.length > 0) return modPlatforms.join(', ');
    if (igdbPlatforms.length === 0) return null;
    const names = igdbPlatforms.map((p) => p.abbreviation ?? p.name);
    const shown = names.slice(0, PLATFORM_CAP).join(', ');
    const overflow = names.length - PLATFORM_CAP;
    return overflow > 0 ? `${shown} +${overflow}` : shown;
}

export function deriveDeveloper(companies: GameCompanyMeta[]): string | null {
    const developers = companies.filter((c) => c.isDeveloper);
    if (developers.length > 0) {
        return developers.map((c) => c.name).join(', ');
    }
    return companies[0]?.name ?? null;
}

export function deriveGenres(genres: string[]): string | null {
    if (genres.length === 0) return null;
    return genres.slice(0, GENRE_CAP).join(', ');
}
