"use server";

import { CreateEventInput, EditEventInput } from "~app/events/types";
import Joi from "joi";
import { getSession } from "~src/actions/session.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { getEventById } from "~src/lib/events";

export async function editEventAction(
    _prevState: unknown,
    eventInput: FormData,
) {
    const session = await getSession();

    if (!session.id) return;

    const eventId = parseInt(eventInput.get("eventId") as string);

    const event = getEventById(eventId);

    if (!event) {
        return {
            message: "Event not found",
        };
    }

    confirmPermission(session, "edit", "event", event);

    const input: EditEventInput = {
        startsAt: new Date(eventInput.get("startsAt") as string),
        endsAt: new Date(eventInput.get("endsAt") as string),
        name: eventInput.get("name") as string,
        type: eventInput.get("type") as string,
        location: eventInput.get("location") as string,
        bluesky: eventInput.get("bluesky") as string,
        discord: eventInput.get("discord") as string,
        language: eventInput.get("language") as string,
        shortDescription: eventInput.get("shortDescription") as string,
        description: eventInput.get("description") as string,
        url: eventInput.get("url") as string,
        imageUrl: eventInput.get("imageUrl") as string,
    };

    const { error } = await validateInput(input);

    if (error) {
        return {
            message: error.message,
        };
    }

    const updatedEvent = { ...event, ...input };

    console.log(updatedEvent);
}

export const validateInput = async (
    input: EditEventInput,
): Promise<Joi.ValidationResult<EditEventInput>> => {
    const createEventSchema: Joi.ObjectSchema<CreateEventInput> = Joi.object({
        startsAt: Joi.date().iso().required(),
        endsAt: Joi.date().iso().greater(Joi.ref("startsAt")).required(),
        name: Joi.string().min(1).max(255).required(),
        type: Joi.string().min(1).max(100).required(),
        location: Joi.string().allow("").optional(),
        bluesky: Joi.string().uri().allow("").optional(),
        discord: Joi.string().uri().allow("").optional(),
        language: Joi.string().min(1).max(50).required(),
        shortDescription: Joi.string().min(1).max(500).required(),
        description: Joi.string().min(1).max(5000).required(),
        url: Joi.string().uri().allow("").optional(),
        imageUrl: Joi.string().uri().allow("").optional(),
    });

    return createEventSchema.validate(input);
};
