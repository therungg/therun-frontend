"use server";

import { getSession } from "~src/actions/session.action";
import { getBaseUrl } from "~src/actions/base-url.action";
import { safeEncodeURI } from "~src/utils/uri";
import type { UserPatreonData } from "~app/change-appearance/patreon-section";
import { getUserPatreonDataFromApi } from "~src/patreon/get-user-patreon-data";

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
        const loginUrl = `${process.env.NEXT_PUBLIC_PATREON_LOGIN_URL}?code=${code}&redirect_uri=${base}&session_id=${sessionId}`;

        const patreonLinkData = await fetch(loginUrl);

        return patreonLinkData.json();
    } else if (session.username) {
        return getUserPatreonDataFromApi(session.username);
    }

    return null;
};
