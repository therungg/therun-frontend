"use client";

import { useStory } from "~app/live/stories/use-story";

const ShowRunStory = ({ username }: { username: string }) => {
    const { story, isLoaded, hasStories } = useStory(username);

    if (!isLoaded) {
        return <>Loading stories...</>;
    }

    if (!hasStories) {
        return <>No recent stories for user!</>;
    }

    return <div>{story!.user}</div>;
};

export default ShowRunStory;
