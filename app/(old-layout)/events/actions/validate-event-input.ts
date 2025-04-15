import {
    CreateEventInput,
    EditEventInput,
} from "../../../../types/events.types";
import Joi from "joi";

export const validateEventInput = async (
    input: EditEventInput,
): Promise<Joi.ValidationResult<EditEventInput>> => {
    const createEventSchema: Joi.ObjectSchema<CreateEventInput> = Joi.object({
        name: Joi.string().min(1).max(255).required(),
        type: Joi.string().min(1).max(100).required(),
        slug: Joi.string().min(1).max(50).required(),

        location: Joi.allow("").optional().default(""),
        language: Joi.string().min(1).max(50).required(),
        shortDescription: Joi.string().min(1).max(500).required(),
        description: Joi.string().min(1).max(5000).required(),
        organizerId: Joi.number().integer().required(),

        startsAt: Joi.date().iso().required(),
        endsAt: Joi.date().iso().greater(Joi.ref("startsAt")).required(),

        bluesky: Joi.allow("").optional(),
        discord: Joi.allow("").optional(),
        submissionsUrl: Joi.allow("").optional(),
        twitter: Joi.allow("").optional(),
        twitch: Joi.allow("").optional(),
        url: Joi.allow("").optional(),
        scheduleUrl: Joi.allow("").optional(),

        charityName: Joi.allow("").optional(),
        charityUrl: Joi.allow("").optional(),
        isForCharity: Joi.boolean().required(),

        imageUrl: Joi.allow("").optional(),
        tier: Joi.number().min(1).max(5),
        isOffline: Joi.boolean().required(),
        tags: Joi.optional(),
        restreams: Joi.optional(),

        createdBy: Joi.string().min(1).max(255).optional(),
    });

    return createEventSchema.validate(input);
};
