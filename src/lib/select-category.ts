import { normalizeSlug } from './normalize-slug';

/**
 * Pick the board a `?board=` value names out of an already-resolved list.
 *
 * Exact match on the canonical backend slug, then a normalized fallback
 * (case/space/hyphen-folded) so older display-derived links still land; no
 * value, or a value nothing answers to, falls back to the first board.
 *
 * Lives outside `resolveCategory` so a caller that already holds the game's
 * category list can select from it without a second cached read: `'use cache'`
 * keys on every argument, so `resolveCategory(id, '120star')` is a different
 * entry from `resolveCategory(id)` and paid for the whole category catalog
 * again on every board switch.
 */
export function selectCategory<T extends { name: string }>(
    categories: T[],
    categorySlug?: string,
): T | null {
    if (categorySlug) {
        const norm = normalizeSlug(categorySlug);
        const match =
            categories.find((c) => c.name === categorySlug) ??
            categories.find((c) => normalizeSlug(c.name) === norm);
        if (match) return match;
    }
    return categories[0] ?? null;
}
