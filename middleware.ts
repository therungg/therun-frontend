import { NextRequest, NextResponse } from "next/server";
import { redirectTournamentsMiddleware } from "./src/middlewares/redirect-tournaments.middleware";
import { routeVisitMiddleware } from "./src/middlewares/route-visit.middleware";

// Only return the response when you need a redirect or something
const middlewareList = [routeVisitMiddleware, redirectTournamentsMiddleware];

type MiddlewareFn = (
    // eslint-disable-next-line no-unused-vars
    request: NextRequest,
    // eslint-disable-next-line no-unused-vars
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
