import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
    const reroutes = [
        "/WaifuRuns",
        "/gsa",
        "/dirtythirty",
        "/saesr",
        "/saesr_events",
        "/DefeatGanonCC"
    ];

    function shouldReroute(reroute: string, pathname: string): boolean {
        return (
            reroute.toLowerCase() === pathname.toLowerCase() &&
            reroute !== pathname
        );
    }

    const redirect = reroutes.find((reroute) =>
        shouldReroute(reroute, request.nextUrl.pathname)
    );

    if (redirect) {
        return NextResponse.redirect(
            `${request.nextUrl.origin}${redirect}${request.nextUrl.search}`
        );
    }

    return NextResponse.next();
}
