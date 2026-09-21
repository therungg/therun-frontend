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
    /** 1-based board page. Omitted/1 -> no `page` param (page 1 is the board's default). */
    page?: number | null;
    /** 'moderation' -> the board's Moderation tab. Omitted/'board' -> no `view` param. */
    view?: 'board' | 'moderation' | null;
}

// Matches data.ts's `DEFAULT_PAGE_SIZE` — the board page size a rank is
// translated against. Kept as a local constant (not imported) since
// data.ts is a server-only page-data module and this file is pure/shared
// with client components.
const DEFAULT_BOARD_PAGE_SIZE = 25;

/**
 * Which 1-based board page a given rank falls on, at the board's page size
 * (25 — see games/[game]/data.ts `DEFAULT_PAGE_SIZE`). Pure.
 */
export function rankToPage(
    rank: number,
    pageSize: number = DEFAULT_BOARD_PAGE_SIZE,
): number {
    return Math.max(1, Math.ceil(rank / pageSize));
}

/**
 * Builds the query params a board URL carries for a given category +
 * subcategory (+ optional page). Pure — no path, no leading `?`.
 */
export function buildBoardQuery({
    categorySlug,
    subcategoryKey,
    page,
    view,
}: BoardLinkContext): URLSearchParams {
    const sp = new URLSearchParams();
    for (const { name, value } of parseSubcategoryKey(subcategoryKey ?? '')) {
        if (name && value) sp.set(name, value);
    }
    // The board selector has its own key and is written last, the convention
    // `pane` and `submit` already follow. It used to share `category` with any
    // subcategory variable of that name, which cost Final Fantasy X both its
    // subcategory links and, when the parts were written over the selector,
    // the board itself.
    if (categorySlug) sp.set('board', categorySlug);
    if (page && page > 1) sp.set('page', String(page));
    if (view && view !== 'board') sp.set('view', view);
    return sp;
}

function withQuery(path: string, sp: URLSearchParams): string {
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
}

/**
 * A game slug as a single URL path segment. Slugs are raw backend names
 * (`ResolvedGame.name`) and may contain `/`, `%`, `?`, `#` — e.g.
 * "legostarwars:thecompletesaga(pc/console)" — so they must be
 * percent-encoded exactly once, at the point they enter a path.
 */
export function gameSegment(gameSlug: string): string {
    return encodeURIComponent(gameSlug);
}

/** Board URL for a game, optionally scoped to a category + subcategory. */
export function buildBoardHref(
    gameSlug: string,
    ctx: BoardLinkContext = {},
): string {
    return withQuery(`/games/${gameSegment(gameSlug)}`, buildBoardQuery(ctx));
}

/**
 * Console Boards-pane URL scoped to the same board slice — the mod-side
 * twin of `buildBoardHref`, so board ↔ curation round-trips keep their
 * category + subcategory context. `pane` is set last so a variable that
 * happens to be named "pane" can never clobber it.
 */
export function buildCurationHref(
    gameSlug: string,
    ctx: BoardLinkContext = {},
): string {
    const sp = buildBoardQuery(ctx);
    sp.set('pane', 'boards');
    return withQuery(`/games/${gameSegment(gameSlug)}/manage`, sp);
}

/**
 * Public page for one finished run. `gameRef` is anything the run route's
 * `resolveGame` accepts: the game's name (`ResolvedGame.name`), its slug, or
 * its display name (the lookup lowercases and drops whitespace, which turns a
 * display name into the name). The route 404s when the run belongs to another
 * game, so the ref must be the run's own game.
 */
export function buildRunHref(gameRef: string, runId: number): string {
    return `/games/${gameSegment(gameRef)}/run/${runId}`;
}

/** Public page for one manual time. Same `gameRef` rules as `buildRunHref`. */
export function buildManualTimeHref(
    gameRef: string,
    manualTimeId: number,
): string {
    return `/games/${gameSegment(gameRef)}/manual/${manualTimeId}`;
}

/**
 * The page a board entry opens: its manual time when it is one, else its run.
 * Null when the entry carries neither id.
 */
export function buildBoardEntryHref(
    gameRef: string,
    entry: {
        source?: 'run' | 'manual';
        runId?: number | null;
        manualTimeId?: number | null;
    },
): string | null {
    if (entry.source === 'manual' && entry.manualTimeId != null) {
        return buildManualTimeHref(gameRef, entry.manualTimeId);
    }
    return entry.runId != null ? buildRunHref(gameRef, entry.runId) : null;
}

/** Query param that opens the submit dialog on a board page. */
export const SUBMIT_PARAM = 'submit';

/**
 * Opens the submit dialog on the board carrying this context. Used by every
 * "Submit a run" / "set the first record" / "Correct this time" entry point,
 * so the dialog opens preselected to the board the runner came from.
 *
 * This used to be a route (`/games/{game}/submit`) with a `mode=claim`
 * variant. It is a query param on the board itself now: the dialog lives on
 * the game page, submitting and claiming collapsed into one flow, and a param
 * keeps every existing entry point working without each one reaching into the
 * page's state. `submit` is set last so a subcategory variable that happens to
 * be named "submit" can never clobber it.
 */
export function buildSubmitHref(
    gameSlug: string,
    ctx: BoardLinkContext = {},
): string {
    const sp = buildBoardQuery(ctx);
    sp.set(SUBMIT_PARAM, '1');
    return withQuery(`/games/${gameSegment(gameSlug)}`, sp);
}

/**
 * Where a game name links to from a public page: the new board when this
 * visitor can see it, else the game's stats page (`/games/<display>`, which
 * resolves display names the same way every other `/games` link does).
 */
export function buildGameHref(
    game: { name: string; display: string },
    boardsVisible: boolean,
): string {
    return boardsVisible
        ? buildBoardHref(game.name)
        : `/games/${encodeURIComponent(game.display)}`;
}

/** The console's "back to the game" link: the board, or the game page when
 * the board isn't open to this viewer. */
export function gameBackLink(
    game: { name: string; display: string },
    boardsVisible: boolean,
): { href: string; label: string } {
    return {
        href: buildGameHref(game, boardsVisible),
        label: boardsVisible ? 'Back to leaderboard' : 'Back to game',
    };
}

/** Console page for one run (moderators). */
export function buildManageRunHref(
    gameSlug: string,
    runId: number | string,
): string {
    return `/games/${gameSegment(gameSlug)}/manage/run/${runId}`;
}

/** The game's console, optionally on one pane (`?pane=`). */
export function buildManageHref(gameRef: string, pane?: string): string {
    const path = `/games/${gameSegment(gameRef)}/manage`;
    return pane ? `${path}?pane=${encodeURIComponent(pane)}` : path;
}

/** Console pane URL (`?pane=`), e.g. `attention` — where held runs and
 * manual times wait on a moderator. */
export function buildConsolePaneHref(gameSlug: string, pane: string): string {
    return buildManageHref(gameSlug, pane);
}

/** A game's page beside its boards: levels, cross-board standings, stats or
 * races. */
export function buildGameSubpageHref(
    gameRef: string,
    page: 'levels' | 'extensions' | 'standings' | 'stats' | 'races',
): string {
    return `/games/${gameSegment(gameRef)}/${page}`;
}

/** Console page for one runner (moderators). */
export function buildModRunnerHref(
    gameSlug: string,
    userId: number,
    from?: string,
): string {
    const base = `/games/${gameSegment(gameSlug)}/manage/moderation/runner/${userId}`;
    return from ? `${base}?from=${encodeURIComponent(from)}` : base;
}
