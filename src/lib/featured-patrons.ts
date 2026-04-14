import { cacheLife, cacheTag } from 'next/cache';
import type {
    FeaturedPatron,
    FeaturedPatronsResponse,
} from '../../types/patreon.types';

async function fetchUserPicture(
    username: string | null,
): Promise<string | null> {
    if (!username) return null;
    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_DATA_URL}/users/global/${username}`,
        );
        if (!res.ok) return null;
        const json = await res.json();
        return (json.result?.picture as string) ?? null;
    } catch {
        return null;
    }
}

async function hydratePatron(
    patron: FeaturedPatron | null,
): Promise<FeaturedPatron | null> {
    if (!patron || patron.preferences?.hide) return null;
    const picture = await fetchUserPicture(patron.username);
    return { ...patron, picture };
}

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

    const [supporterOfTheDay, latestPatron] = await Promise.all([
        hydratePatron(data.supporterOfTheDay),
        hydratePatron(data.latestPatron),
    ]);

    return { supporterOfTheDay, latestPatron };
}
