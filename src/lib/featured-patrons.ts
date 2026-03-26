import { cacheLife, cacheTag } from 'next/cache';
import type { FeaturedPatronsResponse } from '../../types/patreon.types';

export async function getFeaturedPatrons(): Promise<FeaturedPatronsResponse> {
    'use cache';
    cacheLife('hours');
    cacheTag('featured-patrons');

    const url = `${process.env.NEXT_PUBLIC_PATREON_API_URL}/featured`;
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`Featured patrons API error: ${res.status}`);
    }

    const data: FeaturedPatronsResponse = await res.json();

    return {
        supporterOfTheDay: data.supporterOfTheDay?.preferences?.hide
            ? null
            : data.supporterOfTheDay,
        latestPatron: data.latestPatron?.preferences?.hide
            ? null
            : data.latestPatron,
    };
}
