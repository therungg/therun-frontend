'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { dataUrl } from '~src/lib/data-url';
import { UserSummary, UserSummaryType } from '~src/types/summary.types';

export const getUserSummary = async (
    user: string,
    type: UserSummaryType = 'week',
    offset: number = 0,
): Promise<UserSummary | undefined> => {
    'use cache';
    cacheLife('minutes');
    cacheTag(`user-summary-${user}`);

    const url = dataUrl(`/summary/${user}/${type}?offset=${offset}`);

    const res = await fetch(url);
    const json = await res.json();

    return json.result as UserSummary | undefined;
};

export const getDateOfFirstUserSummary = async (
    user: string,
    type: UserSummaryType = 'week',
): Promise<string | undefined> => {
    'use cache';
    cacheLife('days');

    const url = dataUrl(`/summary/${user}/${type}?first=true`);

    const res = await fetch(url);
    const json = await res.json();

    const { result } = json;

    if (!result) return undefined;

    return result.replace(type + '#', '');
};
