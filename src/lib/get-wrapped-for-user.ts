'use server';

import { WrappedWithData } from '~app/(old-layout)/[username]/wrapped/wrapped-types';

export const getWrappedForUser = async (
    user: string,
): Promise<WrappedWithData> => {
    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/wrapped/${encodeURIComponent(user)}`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result as WrappedWithData;
};
