import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_KEY, parseCookie } from '~src/utils/cookies';

const fileTypes = [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'svg',
    'css',
    'js',
    'map',
    'woff',
    'woff2',
    'ttf',
    'ico',
    'webp',
    'webmanifest',
];

export const routeVisitMiddleware = (
    request: NextRequest,
    response: NextResponse,
) => {
    const url = request.nextUrl.clone();
    const visitPath = url.pathname;

    // Exclude API and resource routes
    if (
        visitPath.startsWith('/api') ||
        visitPath.startsWith('/_next') ||
        new RegExp(`.(${fileTypes.join('|')})$`).test(visitPath)
    ) {
        return;
    }

    const recentVisitsCookie = request.cookies.get(COOKIE_KEY.RECENT_VISITS);
    const visitCookie = request.cookies.get(COOKIE_KEY.PAGE_VISITS);
    const visits: Record<string, number> = parseCookie(visitCookie, {});
    const recentVisits: string[] = parseCookie(recentVisitsCookie, []);

    // 0-9 visits and it's not in the list
    if (!recentVisits.includes(visitPath) && recentVisits.length < 10) {
        recentVisits.push(visitPath);
        // 10 visits and it's not in the list. shift the first one out.
    } else if (
        !recentVisits.includes(visitPath) &&
        recentVisits.length === 10
    ) {
        recentVisits.shift();
        recentVisits.push(visitPath);
        // 0-10 visits and it's in the list. remove it and push it to the end.
    } else if (recentVisits.includes(visitPath) && recentVisits.length <= 10) {
        recentVisits.splice(recentVisits.indexOf(visitPath), 1);
        recentVisits.push(visitPath);
    }

    // Update visit count
    visits[visitPath] = (visits[visitPath] || 0) + 1;
    const newVisitCookieValue = JSON.stringify(visits);
    const recentVisitsCookieValue = JSON.stringify(recentVisits);
    // Set updated visits in cookies
    response.cookies.set(COOKIE_KEY.PAGE_VISITS, newVisitCookieValue);
    response.cookies.set(COOKIE_KEY.RECENT_VISITS, recentVisitsCookieValue);
};
