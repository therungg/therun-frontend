import { NextRequest, NextResponse } from "next/server";
import { getAllTournamentSlugs } from "~app/tournaments/tournament-list";

export function middleware(request: NextRequest) {
    const reroutes = getAllTournamentSlugs();

    const shouldReroute = (reroute: string, pathname: string): boolean => {
        return (
            reroute.toLowerCase() === pathname.toLowerCase() &&
            reroute !== pathname
        );
    };

    const redirect = reroutes.find((reroute) =>
        shouldReroute(reroute, request.nextUrl.pathname.replace("/", ""))
    );

    if (redirect) {
        return NextResponse.redirect(
            `${request.nextUrl.origin}/${redirect}${request.nextUrl.search}`
        );
    }

    return NextResponse.next();
}
