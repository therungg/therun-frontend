import { NextRequest, NextResponse } from "next/server";
import { COOKIE_KEY } from "~src/utils/cookies";

const fileTypes = [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "svg",
    "css",
    "js",
    "map",
    "woff",
    "woff2",
    "ttf",
    "ico",
    "webp",
    "webmanifest",
];

export const routeVisitMiddleware = (
    request: NextRequest,
    response: NextResponse,
) => {
    const url = request.nextUrl.clone();
    const visitPath = url.pathname;

    // Exclude API and resource routes
    if (
        visitPath.startsWith("/api") ||
        visitPath.startsWith("/_next") ||
        new RegExp(`.(${fileTypes.join("|")})$`).test(visitPath)
    ) {
        return;
    }

    const visitCookie = request.cookies.get(COOKIE_KEY.PAGE_VISITS);
    let visits: Record<string, number> = {};
    if (visitCookie) {
        try {
            visits = JSON.parse(visitCookie.value);
        } catch (e) {
            // Handle the case where the cookie is not valid JSON
            visits = {};
        }
    }

    // Update visit count
    visits[visitPath] = (visits[visitPath] || 0) + 1;
    const cookieValue = JSON.stringify(visits);
    // Set updated visits in cookies
    response.cookies.set(COOKIE_KEY.PAGE_VISITS, cookieValue);
};
