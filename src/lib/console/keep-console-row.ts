/**
 * Whether a manage-category row belongs in the console at all.
 *
 * The console merges two lists that look alike and are not: `loadConsoleCatalog().rows`
 * (every category in pageData, junk included) and `resolveCategory`, whose
 * `categories` are already the curated population — it returns stats rows that
 * clear the activity floor PLUS every pageData category with no stats row at
 * all (zero-run boards, freshly materialised level boards), and only those.
 *
 * So the floor has already been applied once, and re-applying
 * `isLowActivityCategory` to the merged row is wrong in both directions: a
 * zero-run level board carries all-zero stats and would be dropped as junk,
 * while a genuinely below-floor category — absent from `resolveCategory` —
 * carries zeros for the same reason and would be kept.
 *
 * Membership in the resolved set is the whole answer.
 */
export function keepConsoleRow(id: number, resolvedIds: Set<number>): boolean {
    return resolvedIds.has(id);
}
