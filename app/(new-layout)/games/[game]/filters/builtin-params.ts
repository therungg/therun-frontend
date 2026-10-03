// URL <-> state for the board's built-in filters. Pure; shared by the server
// loader (data.ts), the popover, the band chips and Clear filters so every
// surface agrees on what "active" means and what a valid value looks like.

export type VideoFilter = 'required' | 'missing';

export interface BuiltinFilterState {
    /** Effective: the URL's `verified` if it names one, else the game's default. */
    verified: boolean;
    /** The game's `defaultVerified` — what a URL without `verified` shows.
     * Not a filter of its own; it decides how `verified` is written back. */
    defaultVerified: boolean;
    video: VideoFilter | null;
    /** 'YYYY-MM-DD', inclusive. */
    from: string | null;
    to: string | null;
    /** ISO-3166 alpha-2, upper-case. */
    country: string | null;
    /** Platform names, as `facets.platforms` spells them. Multi-select: the
     * values OR together. Empty means no platform filter. */
    playedon: string[];
    /** Every run instead of one entry per runner: a runner's slower and
     * beaten runs get their own rows. */
    allruns: boolean;
}

export const BUILTIN_PARAM_KEYS = [
    'verified',
    'video',
    'from',
    'to',
    'country',
    'playedon',
    'allruns',
] as const;

/** The backend keeps at most 50 values and matches case-insensitively, so a
 * longer list or a repeat spelling buys nothing. */
const MAX_PLATFORMS = 50;

export function parsePlayedOn(raw: string | undefined): string[] {
    if (!raw) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const part of raw.split(',')) {
        const value = part.trim();
        if (value.length === 0) continue;
        const key = value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(value);
        if (out.length === MAX_PLATFORMS) break;
    }
    return out;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDay(s: string): boolean {
    if (!DAY_RE.test(s)) return false;
    const d = new Date(`${s}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function parseBuiltinParams(
    sp: Record<string, string | undefined>,
    defaultVerified = false,
): BuiltinFilterState {
    const video =
        sp.video === 'required' || sp.video === 'missing' ? sp.video : null;
    const from = sp.from && isValidDay(sp.from) ? sp.from : null;
    const to = sp.to && isValidDay(sp.to) ? sp.to : null;
    const country =
        sp.country && /^[A-Za-z]{2}$/.test(sp.country)
            ? sp.country.toUpperCase()
            : null;
    return {
        verified:
            sp.verified === 'true'
                ? true
                : sp.verified === 'false'
                  ? false
                  : defaultVerified,
        defaultVerified,
        video,
        from,
        to,
        country,
        playedon: parsePlayedOn(sp.playedon),
        allruns: sp.allruns === '1' || sp.allruns === 'true',
    };
}

/**
 * Writes `verified` relative to the game's default: the default value leaves
 * the URL bare, the other one is spelled out (`?verified=false` on a game
 * whose boards open on verified runs).
 */
export function writeVerifiedParam(
    sp: URLSearchParams,
    verified: boolean,
    defaultVerified: boolean,
): void {
    if (verified === defaultVerified) sp.delete('verified');
    else sp.set('verified', verified ? 'true' : 'false');
}

export function countBuiltinFilters(s: BuiltinFilterState): number {
    return (
        (s.verified ? 1 : 0) +
        (s.video ? 1 : 0) +
        (s.from || s.to ? 1 : 0) +
        (s.country ? 1 : 0) +
        // One per platform, not one for the group: the band draws a chip per
        // value, and a count that says "1" next to three chips reads wrong.
        s.playedon.length +
        (s.allruns ? 1 : 0)
    );
}

export function hasBuiltinFilters(s: BuiltinFilterState): boolean {
    return countBuiltinFilters(s) > 0;
}
