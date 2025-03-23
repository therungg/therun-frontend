import { CreateEventInput, EditEventInput } from "../../../types/events.types";
import Joi from "joi";

export const validateEventInput = async (
    input: EditEventInput,
): Promise<Joi.ValidationResult<EditEventInput>> => {
    const createEventSchema: Joi.ObjectSchema<CreateEventInput> = Joi.object({
        startsAt: Joi.date().iso().required(),
        endsAt: Joi.date().iso().greater(Joi.ref("startsAt")).required(),
        name: Joi.string().min(1).max(255).required(),
        type: Joi.string().min(1).max(100).required(),
        location: Joi.allow("").optional().default(""),
        bluesky: Joi.string().uri().allow("").optional(),
        discord: Joi.string().uri().allow("").optional(),
        language: Joi.string().min(1).max(50).required(),
        shortDescription: Joi.string().min(1).max(500).required(),
        description: Joi.string().min(1).max(5000).required(),
        url: Joi.string().uri().allow("").optional(),
        imageUrl: Joi.string().uri().allow("").optional(),
        organizerId: Joi.number().integer().required(),
        createdBy: Joi.string().min(1).max(255).optional(),
        tier: Joi.number().min(1).max(5),
        isOffline: Joi.boolean().required(),
    });

    return createEventSchema.validate(input);
};
