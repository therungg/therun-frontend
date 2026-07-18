/**
 * Case-insensitive identity check for runner names. Usernames are stored and
 * displayed with their canonical casing, but session state and leaderboard
 * entries don't always agree on case (e.g. OAuth-provided casing vs.
 * historical run data) — a strict `===` silently breaks "this is you"
 * highlighting, find-me, and own-run actions when casing diverges.
 */
export function isSameRunner(
    a: string | null | undefined,
    b: string | null | undefined,
): boolean {
    if (!a || !b) return false;
    return a.toLowerCase() === b.toLowerCase();
}
