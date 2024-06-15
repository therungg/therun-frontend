"use server";

import { getSession } from "~src/actions/session.action";
import { getApiKey } from "~src/actions/api-key.action";
import { EditRaceInput } from "~app/races/races.types";
import Joi from "joi";
import { redirect } from "next/navigation";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export async function editRace(_prevState: unknown, raceInput: FormData) {
    const input: EditRaceInput = {
        description: raceInput.get("description") as string,
        customName: raceInput.get("customName") as string,
        forceStream: raceInput.get("forceStream") as string,
    };

    const raceId = raceInput.get("raceId") as string;

    const { error } = validateInput(input);

    if (error) {
        return {
            message: error.message,
        };
    }

    const session = await getSession();
    const apiKey = getApiKey();

    if (!session.id) return;

    const result = await fetch(`${racesApiUrl}/${raceId}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${session.id}`,
            "x-api-key": apiKey,
        },
        body: JSON.stringify(input),
    });

    if (result.status !== 200) {
        const response = await result.text();
        return { message: response };
    }

    redirect(`/races/${raceId}`);
}

export const validateInput = (
    input: EditRaceInput,
): Joi.ValidationResult<EditRaceInput> => {
    const raceSchema: Joi.ObjectSchema<EditRaceInput> = Joi.object({
        customName: Joi.string().min(0).max(40).optional(),
        description: Joi.string().min(0).max(1000).optional(),
        forceStream: Joi.string().min(0).max(100).optional(),
    });

    return raceSchema.validate(input);
};
