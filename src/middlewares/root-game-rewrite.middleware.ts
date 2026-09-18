import type { NextRequest, NextResponse } from 'next/server';
import { NextResponse as Response } from 'next/server';
import { getAllTournamentSlugs } from '~app/(new-layout)/tournaments/tournament-list';
import { ROOT_ROUTES } from '~src/generated/root-routes';
import { getRootNames } from './root-names';

/**
 * Games at the site root: `/smo` and `/supermarioodyssey` render the game page
 * without redirecting, so the address bar keeps the short URL while the page
 * tree lives once under `/games/`.
 *
 * Precedence, highest first: our own routes, tournament slugs, game slugs,
 * game names, then usernames. Everything above usernames is decided here;
 * anything this function doesn't claim falls through to `/[username]`.
 *
 * See docs/plans/2026-09-11-root-game-slugs-design.md.
 */

/** Off by default; the collision list gets reviewed before this goes on. */
function enabled(): boolean {
    return process.env.NEXT_PUBLIC_ROOT_GAME_URLS === 'true';
}

/**
 * The `games.name` form: lowercased, whitespace stripped, punctuation kept.
 * Mirrors the backend's convertToSearchable, which is what built the names
 * this is matched against.
 */
function toNameForm(segment: string): string {
    return segment.toLowerCase().replace(/\s/g, '');
}

export const rootGameRewriteMiddleware = (
    request: NextRequest,
): NextResponse | void => {
    if (!enabled()) return;

    const { pathname } = request.nextUrl;
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return;

    let first: string;
    try {
        first = decodeURIComponent(segments[0]);
    } catch {
        first = segments[0];
    }

    // Our own routes always win — the set is generated from app/, so a game
    // named `live` cannot take /live.
    if (ROOT_ROUTES.has(first.toLowerCase())) return;
    // Tournaments next. The tournament redirect middleware runs before this
    // one, but it only fires on a case mismatch, so check the list too.
    if (getAllTournamentSlugs().some((slug) => slug === first)) return;

    const sets = getRootNames();
    // Nothing loaded yet, or the backend is down: fall through to the user.
    if (!sets) return;

    // Exact matches only. normalizeUrlSlug folds `_` to `-`, which would let
    // the game slug `celeste` swallow the user `celeste_`; that looser
    // matching stays a /games/ concern.
    const isGame =
        sets.slugs.has(first.toLowerCase()) ||
        sets.names.has(toNameForm(first));
    if (!isGame) return;

    const url = request.nextUrl.clone();
    url.pathname = `/games/${segments.join('/')}`;
    return Response.rewrite(url);
};
