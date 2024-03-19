"use server";

import { getSession } from "~src/actions/session.action";
import { getApiKey } from "~src/actions/api-key.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { CreateRaceInput, RaceStartMethodType } from "~app/races/races.types";
import Joi from "joi";
import { redirect } from "next/navigation";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export async function createRace(prevState: any, raceInput: FormData) {
    const input: CreateRaceInput = {
        game: raceInput.get("game") as string,
        category: raceInput.get("category") as string,
        id: raceInput.get("id") as string,
        description: raceInput.get("description") as string,
        customName: raceInput.get("customName") as string,
        selfJoin: !!raceInput.get("selfJoin"),
        ranked: !!raceInput.get("ranked"),
        forceStream: raceInput.get("forceStream") as string,
        password: raceInput.get("password") as string,
        countdown: Number(raceInput.get("countdown")),
        startMethod: raceInput.get("startMethod") as
            | RaceStartMethodType
            | undefined,
        startTime: raceInput.get("startTime") as string | undefined,
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

    // Confirm final time without asking automatically
    input.autoConfirm = false;

    const result = await fetch(racesApiUrl, {
        method: "POST",
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

    const raceId = (await result.json()).result.raceId;

    redirect(`/races/${raceId}`);
}

export const validateInput = (
    input: CreateRaceInput,
): Joi.ValidationResult<CreateRaceInput> => {
    const raceSchema: Joi.ObjectSchema<CreateRaceInput> = Joi.object({
        game: Joi.string().required().min(1).max(200),
        category: Joi.string().required().min(1).max(200),
        id: Joi.string().min(0).max(40).optional(),
        customName: Joi.string().min(0).max(40).optional(),
        description: Joi.string().min(0).max(1000).optional(),
        ranked: Joi.boolean().optional(),
        selfJoin: Joi.boolean().optional(),
        canStartEarly: Joi.boolean().optional(),
        previousRaceId: Joi.string().min(3).max(5).optional(),
        forceStream: Joi.string().min(0).max(100).optional(),
        password: Joi.string().min(0).max(100).optional(),
        autoConfirm: Joi.boolean().optional(),
        countdown: Joi.number()
            .optional()
            .min(3)
            .max(60 * 60),
        startMethod: Joi.string()
            .valid(
                ...([
                    "everyone-ready",
                    "moderator",
                    "datetime",
                ] as RaceStartMethodType[]),
            )
            .optional(),
        startTime: Joi.optional(),
    });

    return raceSchema.validate(input);
};
