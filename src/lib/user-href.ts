/**
 * The in-site URL for a runner's profile.
 *
 * Profiles answer at both `/<name>` and `/users/<name>`, but games win the
 * root: a plain alphanumeric game name of four characters or more collides
 * with a Twitch login, and there are many. A link built as `/<name>` can
 * therefore land silently on a game page, so every in-site link uses this
 * form. The short one stays valid for typed and older shared URLs.
 *
 * See docs/plans/2026-09-11-root-game-slugs-design.md.
 */
export function userHref(name: string, subpath?: string): string {
    const base = `/users/${encodeURIComponent(name)}`;
    if (!subpath) return base;
    return `${base}/${subpath.replace(/^\//, '')}`;
}
