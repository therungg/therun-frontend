'use server';

import { WrappedWithData } from '~app/(new-layout)/[username]/wrapped/wrapped-types';
import { dataUrl } from '~src/lib/data-url';

export const getWrappedForUser = async (
    user: string,
): Promise<WrappedWithData> => {
    const url = dataUrl(`/wrapped/${encodeURIComponent(user)}`);

    const res = await fetch(url);
    const json = await res.json();

    return json.result as WrappedWithData;
};
