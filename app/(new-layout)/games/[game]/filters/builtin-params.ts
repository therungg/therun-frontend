// URL <-> state for the board's built-in filters. Pure; shared by the server
// loader (data.ts), the popover, the band chips and Clear filters so every
// surface agrees on what "active" means and what a valid value looks like.

export type VideoFilter = 'required' | 'missing';

export interface BuiltinFilterState {
    verified: boolean;
    video: VideoFilter | null;
    /** 'YYYY-MM-DD', inclusive. */
    from: string | null;
    to: string | null;
    /** ISO-3166 alpha-2, upper-case. */
    country: string | null;
}

export const BUILTIN_PARAM_KEYS = [
    'verified',
    'video',
    'from',
    'to',
    'country',
] as const;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDay(s: string): boolean {
    if (!DAY_RE.test(s)) return false;
    const d = new Date(`${s}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function parseBuiltinParams(
    sp: Record<string, string | undefined>,
): BuiltinFilterState {
    const video =
        sp.video === 'required' || sp.video === 'missing' ? sp.video : null;
    const from = sp.from && isValidDay(sp.from) ? sp.from : null;
    const to = sp.to && isValidDay(sp.to) ? sp.to : null;
    const country =
        sp.country && /^[A-Za-z]{2}$/.test(sp.country)
            ? sp.country.toUpperCase()
            : null;
    return { verified: sp.verified === 'true', video, from, to, country };
}

export function countBuiltinFilters(s: BuiltinFilterState): number {
    return (
        (s.verified ? 1 : 0) +
        (s.video ? 1 : 0) +
        (s.from || s.to ? 1 : 0) +
        (s.country ? 1 : 0)
    );
}

export function hasBuiltinFilters(s: BuiltinFilterState): boolean {
    return countBuiltinFilters(s) > 0;
}
