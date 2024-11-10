"use server";

import { StoryPreferences } from "~app/live/story.types";
import Joi from "joi";
import { getSession } from "~src/actions/session.action";
import { getApiKey } from "~src/actions/api-key.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { redirect } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_STORIES_API_URL as string;

export async function setStoryPreferencesAction(
    _prevState: unknown,
    raceInput: FormData,
) {
    const input: StoryPreferences = {
        enabled: !!raceInput.get("enabled"),
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
        return { message: response };
    }

    redirect(`/stories/manage`);
}

const validateInput = (input: StoryPreferences) => {
    const schema: Joi.ObjectSchema<StoryPreferences> = Joi.object({
        enabled: Joi.boolean(),
    });

    return schema.validate(input);
};
