// Pure resolution of the runner page's "Back" target — no React, no
// fetching — trivially reasoned about and unit-tested.

export interface RunnerBackTarget {
    href: string;
    label: string;
}

/**
 * `from` is allowlisted, not reflected: today only `roster` is a known
 * origin, so anything else (missing, garbage, or some other page's slug)
 * falls back to the console's attention pane, which is the runner page's
 * true default parent. `categoryId` is validated against this game's real
 * category list — the same bar the console shell's own `?cat=` reader and
 * the roster page's own `?categoryId=` reader hold their URL params to —
 * so a stale or forged id never gets echoed back into the roster link.
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
            href: `/games-v2/${gameSlug}/manage/moderation/roster${query}`,
            label: 'Back to Browse runs',
        };
    }
    return {
        href: `/games-v2/${gameSlug}/manage?pane=attention`,
        label: 'Back to console',
    };
}
