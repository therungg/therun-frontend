"use server";

import {
    StoryOption,
    StoryPreferences,
    StoryWithSplitsStories,
} from "~app/live/story.types";
import { User } from "../../types/session.types";
import { getPronounsFromString } from "~app/stories/manage/get-pronouns-from-string";

export const getStoryByUser = async (username: string) => {
    const storyApiUrl = process.env.NEXT_PUBLIC_STORIES_API_URL as string;

    const url = storyApiUrl + "/user/" + encodeURIComponent(username) + "/live";

    const story = await fetch(url, {
        method: "GET",
    });

    return (await story.json()).result as StoryWithSplitsStories;
};

export const getStoryOptions = async () => {
    const storyApiUrl = process.env.NEXT_PUBLIC_STORIES_API_URL as string;

    const url = storyApiUrl + "/story-options";

    const options = await fetch(url, {
        method: "GET",
    });

    return (await options.json()).result as StoryOption[];
};

export const getStoryPreferencesByUser = async (user: User) => {
    const storyApiUrl = process.env.NEXT_PUBLIC_STORIES_API_URL as string;

    const url =
        storyApiUrl +
        "/user/" +
        encodeURIComponent(user.username) +
        "/preferences";

    const story = await fetch(url, {
        method: "GET",
    });

    const result = (await story.json()).result as StoryPreferences | undefined;

    if (result === undefined) {
        const defaultPronouns = getPronounsFromString(user.pronouns);
        const defaultPreferences: StoryPreferences = {
            useLastNRuns: 0,
            enabled: false,
            disableNegativeStories: false,
            disableWelcomeStories: false,
            allowAIRephrase: false,
            translateLanguage: null,
            globalStoryCooldown: 0,
            changeGoldToRainbow: false,
            allowGlobalStoryCooldownOverride: false,
            nameOverride: user.username,
            pronounOverrideThey: defaultPronouns[0],
            pronounOverrideThem: defaultPronouns[1],
            pronounOverrideTheir: defaultPronouns[2],
            disabledStories: [],
            customCooldowns: {},
        };

        return defaultPreferences;
    }

    return result;
};
