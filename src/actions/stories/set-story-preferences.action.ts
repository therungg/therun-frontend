"use server";

import { StoryPreferences } from "~app/live/story.types";
import Joi from "joi";
import { getSession } from "~src/actions/session.action";
import { getApiKey } from "~src/actions/api-key.action";
import { confirmPermission } from "~src/rbac/confirm-permission";

const apiUrl = process.env.NEXT_PUBLIC_STORIES_API_URL as string;

export async function setStoryPreferencesAction(
    _prevState: unknown,
    raceInput: FormData,
) {
    console.log(raceInput.get("translateLanguage"));
    const input: StoryPreferences = {
        enabled: !!raceInput.get("enabled"),
        disableNegativeStories: !!raceInput.get("disableNegativeStories"),
        disableWelcomeStories: !!raceInput.get("disableWelcomeStories"),
        allowAIRephrase: false,
        translateLanguage: raceInput.get("translateLanguage") || "",
        globalStoryCooldown: raceInput.get("globalStoryCooldown"),
        allowGlobalStoryCooldownOverride: !!raceInput.get(
            "allowGlobalStoryCooldownOverride",
        ),
        changeGoldToRainbow: !!raceInput.get("changeGoldToRainbow"),
        nameOverride: raceInput.get("nameOverride"),
        pronounOverrideThey: raceInput.get("pronounOverrideThey"),
        pronounOverrideThem: raceInput.get("pronounOverrideThem"),
        pronounOverrideTheir: raceInput.get("pronounOverrideTheir"),
    };

    const { error } = validateInput(input);

    if (error) {
        console.error("here!!");
        return {
            message: error.message,
            type: "error",
        };
    }

    const session = await getSession();
    const apiKey = getApiKey();

    if (!session.id) return;

    confirmPermission(session, "edit", "stories");

    const result = await fetch(
        apiUrl + `/user/${session.username}/preferences`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${session.id}`,
                "x-api-key": apiKey,
            },
            body: JSON.stringify(input),
        },
    );

    if (result.status !== 200) {
        const response = await result.text();
        return { message: response, type: "error" };
    }

    return {
        message: "Story preferences succesfully updated!",
        type: "success",
    };
}

const validateInput = (input: StoryPreferences) => {
    const schema: Joi.ObjectSchema<StoryPreferences> = Joi.object({
        enabled: Joi.boolean(),
        disableNegativeStories: Joi.boolean(),
        disableWelcomeStories: Joi.boolean(),
        allowAIRephrase: Joi.boolean(),
        translateLanguage: Joi.optional(),
        globalStoryCooldown: Joi.number().optional(),
        allowGlobalStoryCooldownOverride: Joi.boolean(),
        changeGoldToRainbow: Joi.boolean(),
        nameOverride: Joi.string().optional(),
        pronounOverrideThey: Joi.string().optional(),
        pronounOverrideThem: Joi.string().optional(),
        pronounOverrideTheir: Joi.string().optional(),
    });

    return schema.validate(input);
};
