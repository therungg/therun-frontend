import { NextRequest, NextResponse } from 'next/server';
import { redirectTournamentsMiddleware } from '~src/middlewares/redirect-tournaments.middleware';
import { rootGameRewriteMiddleware } from '~src/middlewares/root-game-rewrite.middleware';

// Only return the response when you need a redirect or something
const middlewareList = [
    // disable for now, there's a bug where this is global.
    // TODO:: Fix this being global
    // routeVisitMiddleware,

    redirectTournamentsMiddleware,
    // Last: it claims root paths nothing above it wanted, and everything it
    // does not claim falls through to /[username].
    rootGameRewriteMiddleware,
];

type MiddlewareFn = (
    request: NextRequest,
    response: NextResponse,
) => NextResponse | void;

function withMiddlewares(middlewares: MiddlewareFn[]) {
    return async (request: NextRequest) => {
        const response = NextResponse.next();

        for (const proxy of middlewares) {
            const result = await proxy(request, response);
            if (result instanceof NextResponse) {
                return result;
            }
        }

        return response;
    };
}

export const proxy = withMiddlewares(middlewareList);

// The proxy runs on Node, so on Vercel every request it matches is a billed
// function invocation — even when the page itself is then served from the CDN.
// Matching every page made it ~65% of all invocations, almost all of it
// crawlers walking /games and /users, where neither middleware can act.
//
// Both only act on paths whose first segment is not one of our own routes:
// tournament slugs are single root segments, and the root-game rewrite leaves
// ROOT_ROUTES alone. So skip `/`, every first segment in
// src/generated/root-routes.ts, and any path with a file extension. The list
// has to be a literal (Next analyses it at build time); a route missing from
// it only costs invocations, it doesn't change behaviour.
export const config = {
    matcher: [
        '/((?!(?:_next|api|about|admin|blog|components|contact|data|discord|dynamic-sitemap|events|fast50|frontpage|games|leaderboards|live|marathon|media|moist-setup|patreon|patron|privacy-policy|races|recap|runs|settings|stories|styles|submissions|support|terms|tournaments|upload|users)(?:/|$)|.*\\..*).+)',
    ],
};
