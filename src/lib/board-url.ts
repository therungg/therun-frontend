// Pure URL-building for every path that points at a specific board slice
// (category + subcategory). Shared by entry links into submit/claim
// (game-hero.tsx, row-actions-menu.tsx, run-actions.tsx) and the
// post-submit "see it on the board" links (submit-form.tsx), so the query
// param names/shape stay identical everywhere the board is reachable —
// matching what data.ts (`GamePageSearchParams`) parses back out on the
// receiving end: a `category` slug plus one raw query param per
// subcategory variable (not a single encoded key).
import { parseSubcategoryKey } from './run-view/parse-subcategory-key';

export interface BoardLinkContext {
    /** Category slug (ResolvedCategory.name). Omitted/falsy -> no `category` param. */
    categorySlug?: string | null;
    /** Canonical `name=value|name=value` subcategory key. Omitted/falsy -> no subcategory params. */
    subcategoryKey?: string | null;
}

/**
 * Builds the query params a board URL carries for a given category +
 * subcategory. Pure — no path, no leading `?`.
 */
export function buildBoardQuery({
    categorySlug,
    subcategoryKey,
}: BoardLinkContext): URLSearchParams {
    const sp = new URLSearchParams();
    if (categorySlug) sp.set('category', categorySlug);
    for (const { name, value } of parseSubcategoryKey(subcategoryKey ?? '')) {
        if (name && value) sp.set(name, value);
    }
    return sp;
}

function withQuery(path: string, sp: URLSearchParams): string {
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
}

/** Board URL for a game, optionally scoped to a category + subcategory. */
export function buildBoardHref(
    gameSlug: string,
    ctx: BoardLinkContext = {},
): string {
    return withQuery(`/games-v2/${gameSlug}`, buildBoardQuery(ctx));
}

/**
 * Submit-page URL carrying the same board context, optionally in claim
 * mode. Used by every "Submit a run" / "set the first record" / "Correct
 * this time" entry point so the submit form can preselect category and
 * subcategory (submit/page.tsx).
 */
export function buildSubmitHref(
    gameSlug: string,
    ctx: BoardLinkContext & { mode?: 'claim' } = {},
): string {
    const sp = buildBoardQuery(ctx);
    if (ctx.mode) sp.set('mode', ctx.mode);
    return withQuery(`/games-v2/${gameSlug}/submit`, sp);
}
