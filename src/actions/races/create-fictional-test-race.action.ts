"use server";

import { getSession } from "~src/actions/session.action";
import { getApiKey } from "~src/actions/api-key.action";
import { confirmPermission } from "~src/rbac/confirm-permission";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export async function createFictionalTestRace() {
    const session = await getSession();
    const apiKey = getApiKey();

    if (!session.id) return;

    confirmPermission(session, "edit", "race");

    const url = `${racesApiUrl}/testRace`;

    await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${session.id}`,
            "x-api-key": apiKey,
        },
    });
}
