"use server";

import { getSession } from "~src/actions/session.action";
import { revalidateTag } from "next/cache";

export async function increaseEndTimeByAnHour(addTimeInput: FormData) {
    const tournamentName = addTimeInput.get("tournament") as string;
    const date = addTimeInput.get("date") as string;
    const heat = addTimeInput.get("heat") as string;
    const session = await getSession();

    if (!session.id) {
        return;
    }

    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/tournaments/${encodeURIComponent(tournamentName)}/setEndtime`;

    await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${session.id}`,
        },
        body: JSON.stringify({ date, heat }),
    });

    revalidateTag(`tournaments`);
}
