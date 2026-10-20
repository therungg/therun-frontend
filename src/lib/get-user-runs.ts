'use server';

import { cacheLife } from 'next/cache';
import { dataUrl } from '~src/lib/data-url';
import { type Run } from '../common/types';

export const getUserRuns = async (
    username: string,
    game?: string,
): Promise<Run[]> => {
    'use cache';
    cacheLife('minutes');

    const url = dataUrl(`/users/${username}${game ? `/${game}` : ''}`);

    const res = await fetch(url, {
        cache: 'force-cache',
        next: {
            revalidate: 600,
            tags: [`/users/${username}`],
        },
    });
    const json = await res.json();

    return json.result;
};
