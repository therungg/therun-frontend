"use server";

import { getSession } from "~src/actions/session.action";
import { redirect } from "next/navigation";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export async function joinRace(prevState: any, raceInput: FormData) {
    const raceId = raceInput.get("raceId") as string;
    const password = raceInput.get("password") as string;
    const session = await getSession();

    if (!session.id) {
        return;
    }

    const url = `${racesApiUrl}/${raceId}/participants`;

    const result = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${session.id}`,
        },
        body: JSON.stringify({ password }),
    });

    if (result.status !== 200) {
        const response = await result.text();
        return { message: response };
    }

    redirect(`/races/${raceId}`);
}
