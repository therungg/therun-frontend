'use server';

import { cacheLife } from 'next/cache';

export const getAdvancedUserStats = async (user: string, timezone: string) => {
    'use cache';
    cacheLife('hours');

    const res = await fetch(
        `https://dxg3hfz4b6ekynso45amgq2ife0tzhnl.lambda-url.eu-west-1.on.aws/${user}/${timezone}`,
    );
    const json = await res.json();

    return json.result;
};
