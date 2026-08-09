/**
 * How a display name becomes a variable's key, and which keys are off limits.
 *
 * Shared by the grid and the add form because both have to reach the same
 * answer: the form blocks a collision before the write, the grid builds the
 * taken-name set the form checks against.
 */

/**
 * Reserved query params that cannot become variable names. A board's filter
 * state travels in the URL, so a variable keyed `page` would fight the pager.
 * Caught in the form rather than by a 400 on save.
 */
export const RESERVED_NAMES = [
    'combined',
    'verified',
    'country',
    'year',
    'page',
    'pagesize',
    'timing',
    'view',
];

/**
 * The key (`nameNormalized`) a display name derives to. Strips the characters
 * the board's URL grammar uses as separators, so a key can never be ambiguous
 * once it lands in a query string.
 */
export function normalizeName(name: string): string {
    return name.toLowerCase().replace(/[\s=|]/g, '');
}
