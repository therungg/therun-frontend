'use server';

import Joi from 'joi';
import { revalidatePath } from 'next/cache';
import {
    StoryElementType,
    StoryPreferences,
} from '~app/(old-layout)/live/story.types';
import { getApiKey } from '~src/actions/api-key.action';
import { getSession } from '~src/actions/session.action';

const apiUrl = process.env.NEXT_PUBLIC_STORIES_API_URL as string;

export async function setStoryPreferencesAction(
    _prevState: unknown,
    raceInput: FormData,
) {
    const entries = Array.from(raceInput.entries());

    const rawStories: StoryElementType[] = entries
        .filter(
            ([key, _]) =>
                key.startsWith('stories.') && key.endsWith('.enabled'),
        )
        .map(([key, _]) => key.split('.')[1] as StoryElementType);

    const disabledStories = rawStories.filter(
        (item) => rawStories.indexOf(item) === rawStories.lastIndexOf(item),
    );

    const cooldowns: Partial<Record<StoryElementType, number>> = {};

    entries
        .filter(
            ([key, _]) =>
                key.startsWith('stories.') && key.endsWith('.cooldown'),
        )
        .forEach(([key, value]) => {
            cooldowns[key.split('.')[1] as StoryElementType] = Number(value);
        });

    const input: StoryPreferences = {
        enabled: !!raceInput.get('enabled'),
        disableNegativeStories: !!raceInput.get('disableNegativeStories'),
        disableWelcomeStories: !!raceInput.get('disableWelcomeStories'),
        allowAIRephrase: false,
        translateLanguage: raceInput.get('translateLanguage') || '',
        globalStoryCooldown: raceInput.get('globalStoryCooldown'),
        allowGlobalStoryCooldownOverride: !!raceInput.get(
            'allowGlobalStoryCooldownOverride',
        ),
        changeGoldToRainbow: !!raceInput.get('changeGoldToRainbow'),
        nameOverride: raceInput.get('nameOverride'),
        pronounOverrideThey: raceInput.get('pronounOverrideThey'),
        pronounOverrideThem: raceInput.get('pronounOverrideThem'),
        pronounOverrideTheir: raceInput.get('pronounOverrideTheir'),
        disabledStories,
        customCooldowns: cooldowns,
    };

    const { error } = validateInput(input);

    if (error) {
        return {
            message: error.message,
            type: 'error',
        };
    }

    const session = await getSession();
    const apiKey = await getApiKey();

    if (!session.id) return;

    const result = await fetch(
        apiUrl + `/user/${session.username}/preferences`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${session.id}`,
                'x-api-key': apiKey,
            },
            body: JSON.stringify(input),
        },
    );

    if (result.status !== 200) {
        const response = await result.text();
        return { message: response, type: 'error' };
    }

    revalidatePath('/stories/manage');

    return {
        message: 'Story preferences succesfully updated!',
        type: 'success',
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
        disabledStories: Joi.array().optional(),
        customCooldowns: Joi.object().optional(),
    });

    return schema.validate(input);
};
