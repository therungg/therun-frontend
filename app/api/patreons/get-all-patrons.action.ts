import { cacheLife, cacheTag } from 'next/cache';
import { PatronMap } from 'types/patreon.types';
import { fetcher } from '~src/utils/fetcher';

export const getAllPatrons = async (): Promise<PatronMap> => {
    // Remote: fetched on frontpage and live-page renders; the patreon
    // webhook revalidates the 'patrons' tag so new patrons get their perks
    // immediately.
    'use cache: remote';
    cacheLife('hours');
    cacheTag('patrons');

    const patreonApiUrl = process.env.NEXT_PUBLIC_PATREON_API_URL as string;

    return fetcher(patreonApiUrl);
};
