"use server";

import { StoryWithSplitsStories } from "~app/live/story.types";

export const getStoryByUser = async (user: string) => {
    const storyApiUrl = process.env.NEXT_PUBLIC_STORIES_API_URL as string;

    const url = storyApiUrl + "/user/" + encodeURIComponent(user) + "/live";

    const story = await fetch(url, {
        method: "GET",
    });

    return (await story.json()).result as StoryWithSplitsStories;
};
