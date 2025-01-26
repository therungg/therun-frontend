import { NextRequest, NextResponse } from "next/server";
import { redirectTournamentsMiddleware } from "~src/middlewares/redirect-tournaments.middleware";

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

        for (const middleware of middlewares) {
            const result = await middleware(request, response);
            if (result instanceof NextResponse) {
                return result;
            }
        }

        return response;
    };
}

export const middleware = withMiddlewares(middlewareList);
