import { NextRequest, NextResponse } from 'next/server';
import { redirectTournamentsMiddleware } from '~src/middlewares/redirect-tournaments.middleware';

// Only return the response when you need a redirect or something
const middlewareList = [
    // disable for now, there's a bug where this is global.
    // TODO:: Fix this being global
    // routeVisitMiddleware,

    redirectTournamentsMiddleware,
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

// Only tournament-slug redirects live here, but without a matcher the proxy
// runs on every request — including static assets and images, which was ~37%
// of all Vercel invocations. Skip api routes, Next internals, and any path
// with a file extension (tournament slugs are single plain segments).
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
