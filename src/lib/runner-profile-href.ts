/**
 * A runner's leaderboards profile — the one place board surfaces, run pages,
 * moderation tools and menus send you to see someone's runs. Guests have a
 * profile head too, so the same path serves them.
 */
export function runnerProfileHref(name: string): string {
    return `/${encodeURIComponent(name)}/leaderboards`;
}
