'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { safeEncodeURI } from '~src/utils/uri';
import { Run } from '../common/types';
import { userRunsTag } from './run-tags';

export const getRun = async (
    username: string,
    game: string,
    run: string,
): Promise<Run> => {
    'use cache';
    cacheLife('minutes');
    // The canonical tag an owner edit expires, plus the `/users/<name>` form
    // the API proxy routes revalidate, so both reach this read.
    cacheTag(userRunsTag(username), `/users/${username}`);

    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/users/${username}/${safeEncodeURI(game)}/${safeEncodeURI(run)}`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};

export const getRunByCustomUrl = async (
    username: string,
    customUrl: string,
): Promise<Run> => {
    'use cache';
    cacheLife('minutes');
    cacheTag(userRunsTag(username), `/users/${username}`);
    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/users/${username}/${safeEncodeURI(customUrl)}`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};
