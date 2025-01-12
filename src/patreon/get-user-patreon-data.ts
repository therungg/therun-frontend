"use server";

import type { UserPatreonData } from "~app/change-appearance/patreon-section";

const patreonApiBaseUrl = process.env.NEXT_PUBLIC_PATREON_API_URL;

export const getUserPatreonDataFromApi = async (
    username: string,
): Promise<UserPatreonData | null> => {
    const patreonDataUrl = `${patreonApiBaseUrl}/patreon/${username}`;
    const patreonLinkData = await fetch(patreonDataUrl, {
        next: { revalidate: 60 * 60 * 2 },
    });

    return patreonLinkData.json();
};
