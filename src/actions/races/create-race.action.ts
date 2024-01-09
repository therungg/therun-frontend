"use server";

import { getSession } from "~src/actions/session.action";
import { getApiKey } from "~src/actions/api-key.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { CreateRaceInput } from "~app/races/races.types";
import { redirect } from "next/navigation";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export async function createRace(raceInput: FormData) {
    const input: CreateRaceInput = {
        game: raceInput.get("game") as string,
        category: raceInput.get("category") as string,
    };

    const session = await getSession();
    const apiKey = getApiKey();

    if (!session.id) return;

    confirmPermission(session, "create", "race");

    await fetch(racesApiUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${session.id}`,
            "x-api-key": apiKey,
        },
        body: JSON.stringify(input),
    });
    redirect("/races");
}
