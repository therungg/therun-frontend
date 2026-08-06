// Pure resolution of the runner page's "Back" target — no React, no
// fetching — trivially reasoned about and unit-tested.

export interface RunnerBackTarget {
    href: string;
    label: string;
}

/**
 * `from` is allowlisted, not reflected: `roster` (Browse runs), `board`
 * (the public leaderboard's row menu) and `boards` (the console's Boards
 * pane — curation row actions and the runner dialog) are the known
 * origins; anything else (missing, garbage, or some other page's slug)
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
    if (from === 'boards') {
        return {
            href: `/games-v2/${encodeURIComponent(gameSlug)}/manage?pane=boards`,
            label: 'Back to Boards',
        };
    }
    return {
        href: `/games-v2/${encodeURIComponent(gameSlug)}/manage`,
        label: 'Back to console',
    };
}
