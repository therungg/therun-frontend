"use server";

import { type UserPatreonData } from "~app/(old-layout)/change-appearance/patreon-section";

export const savePatreonSettings = async (
    user: string,
    preferences: UserPatreonData,
) => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/users/patreon/${user}`;

    const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(preferences),
    });

    return res.json();
};
