import { NextRequest, NextResponse } from "next/server";
import { getAllTournamentSlugs } from "~app/tournaments/tournament-list";

export const redirectTournamentsMiddleware = (
    request: NextRequest,
    // eslint-disable-next-line no-unused-vars
    _response: NextResponse,
) => {
    const reroutes = getAllTournamentSlugs();

    const shouldReroute = (reroute: string, pathname: string): boolean => {
        return (
            reroute.toLowerCase() === pathname.toLowerCase() &&
            reroute !== pathname
        );
    };

    const redirect = reroutes.find((reroute) =>
        shouldReroute(reroute, request.nextUrl.pathname.replace("/", "")),
    );

    if (redirect) {
        return NextResponse.redirect(
            `${request.nextUrl.origin}/${redirect}${request.nextUrl.search}`,
        );
    }
};
