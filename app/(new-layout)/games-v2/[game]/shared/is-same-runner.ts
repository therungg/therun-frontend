/**
 * Case-insensitive identity check for runner names. Usernames are stored and
 * displayed with their canonical casing, but session state and leaderboard
 * entries don't always agree on case (e.g. OAuth-provided casing vs.
 * historical run data) — a strict `===` silently breaks "this is you"
 * highlighting, find-me, and own-run actions when casing diverges.
 *
 * `.toLowerCase()` is scoped to Twitch usernames: Twitch enforces an ASCII
 * alphanumeric + underscore charset (no locale-dependent casing rules), so
 * this is safe without an Intl-aware/locale-sensitive comparison. It is
 * NOT a general-purpose i18n-safe string comparator — don't reach for it
 * outside runner-identity checks.
 */
export function isSameRunner(
    a: string | null | undefined,
    b: string | null | undefined,
): boolean {
    if (!a || !b) return false;
    return a.toLowerCase() === b.toLowerCase();
}
