"use server";

import { getSession } from "~src/actions/session.action";
import { getApiKey } from "~src/actions/api-key.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { CreateRaceInput } from "~app/races/races.types";
import Joi from "joi";
import { redirect } from "next/navigation";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export async function createRace(prevState: any, raceInput: FormData) {
    const input: CreateRaceInput = {
        game: raceInput.get("game") as string,
        category: raceInput.get("category") as string,
        description: raceInput.get("description") as string,
        customName: raceInput.get("customName") as string,
    };

    const { error } = validateInput(input);

    if (error) {
        return {
            message: error.message,
        };
    }

    const session = await getSession();
    const apiKey = getApiKey();

    if (!session.id) return;

    confirmPermission(session, "create", "race");

    const result = await fetch(racesApiUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${session.id}`,
            "x-api-key": apiKey,
        },
        body: JSON.stringify(input),
    });

    if (result.status !== 200) {
        return { message: await result.text() };
    }

    const raceId = (await result.json()).result.raceId;

    redirect(`/races/${raceId}`);
}

export const validateInput = (
    input: CreateRaceInput,
): Joi.ValidationResult<CreateRaceInput> => {
    const raceSchema: Joi.ObjectSchema<CreateRaceInput> = Joi.object({
        game: Joi.string().required().min(1).max(200),
        category: Joi.string().required().min(1).max(200),
        description: Joi.string().min(1).max(1000).optional(),
        selfJoin: Joi.boolean().optional(),
        canStartEarly: Joi.boolean().optional(),
        customName: Joi.string().min(1).max(40).optional(),
        previousRaceId: Joi.string().min(3).max(5).optional(),
        forceStream: Joi.string().optional(),
        password: Joi.string().optional(),
        ranked: Joi.boolean().optional(),
        autoConfirm: Joi.boolean().optional(),
    });

    return raceSchema.validate(input);
};
