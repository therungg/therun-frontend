'use server';

import type { UserPatreonData } from '~app/(old-layout)/change-appearance/patreon-section';
import { getBaseUrl } from '~src/actions/base-url.action';
import { getSession } from '~src/actions/session.action';
import { safeEncodeURI } from '~src/utils/uri';

const patreonApiBaseUrl = process.env.NEXT_PUBLIC_PATREON_API_URL;
const patreonLoginUrl = process.env.NEXT_PUBLIC_PATREON_LOGIN_URL;

export const getUserPatreonData = async (query: {
    code?: string;
    scope?: string;
}): Promise<UserPatreonData | null> => {
    const baseUrl = await getBaseUrl();

    if (!baseUrl) {
        return null;
    }

    const session = await getSession();

    if (query.code && session.id && !query.scope) {
        const { code } = query;
        const sessionId = session.id;

        const base = safeEncodeURI(`${baseUrl}/change-appearance`);
        const loginUrl = `${patreonLoginUrl}?code=${code}&redirect_uri=${base}&session_id=${sessionId}`;

        const patreonLinkData = await fetch(loginUrl);

        return patreonLinkData.json();
    } else if (session.username) {
        const patreonDataUrl = `${patreonApiBaseUrl}/patreon/${session.username}`;
        const patreonLinkData = await fetch(patreonDataUrl);

        return patreonLinkData.json();
    }

    return null;
};
