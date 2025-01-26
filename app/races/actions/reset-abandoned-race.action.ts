"use server";

import { getSession } from "~src/actions/session.action";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export async function resetAbandonedRace(raceInput: FormData) {
    const raceId = raceInput.get("raceId") as string;
    const session = await getSession();

    if (!session.id) {
        return;
    }

    const url = `${racesApiUrl}/${raceId}/reset`;

    await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${session.id}`,
        },
    });
}
