// Pure resolution of the runner page's "Back" target — no React, no
// fetching — trivially reasoned about and unit-tested.

export interface RunnerBackTarget {
    href: string;
    label: string;
}

/**
 * `from` is allowlisted, not reflected: `roster` (Browse runs) and `board`
 * (the public leaderboard's row menu) are the known origins; anything else
 * (missing, garbage, a retired origin, or some other page's slug)
 * falls back to the console's front door. `categoryId` is validated
 * against this game's real category list — the same bar the console
 * shell's own `?cat=` reader and the roster page's own `?categoryId=`
 * reader hold their URL params to — so a stale or forged id never gets
 * echoed back into the roster link.
 */
export function resolveRunnerBackTarget(
    gameSlug: string,
    from: string | null,
    categoryId: string | null,
    categories: readonly { id: number }[],
): RunnerBackTarget {
    if (from === 'roster') {
        const parsed = categoryId ? Number.parseInt(categoryId, 10) : NaN;
        const validCategoryId =
            Number.isFinite(parsed) && categories.some((c) => c.id === parsed)
                ? parsed
                : null;
        const query =
            validCategoryId != null ? `?categoryId=${validCategoryId}` : '';
        return {
            href: `/games-v2/${encodeURIComponent(gameSlug)}/manage/moderation/roster${query}`,
            label: 'Back to Browse runs',
        };
    }
    if (from === 'board') {
        return {
            href: `/games-v2/${encodeURIComponent(gameSlug)}`,
            label: 'Back to leaderboard',
        };
    }
    // `boards` (the console's Boards pane) is pulled for now, so it falls
    // through to the front door with the rest. Restore by returning
    // `?pane=boards` / 'Back to Boards' here once the pane is back in the nav.
    return {
        href: `/games-v2/${encodeURIComponent(gameSlug)}/manage`,
        label: 'Back to console',
    };
}
