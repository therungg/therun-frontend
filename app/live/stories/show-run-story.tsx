"use client";

import { useStory } from "~app/live/stories/use-story";

export const ShowRunStory = ({ user }: { user: string }) => {
    const { story, isLoaded } = useStory(user);

    if (!isLoaded) return <>Loading story...</>;

    if (!story)
        return (
            <>
                This user has no story yet. This happens when they have not done
                50 runs yet.
            </>
        );

    // This is a concept to show that it works and monitor the stories
    return (
        <div className="h-100 overflow-auto border p-2">
            {story.stories.map((storyElement) => {
                const showStories = storyElement.storyElements.filter(
                    (el) => el.selected,
                );

                return (
                    <div key={"story-" + storyElement.splitIndex}>
                        <span className="fs-large fw-bold">
                            {storyElement.splitName}
                        </span>
                        {showStories.map((showStory) => {
                            return (
                                <div
                                    key={showStory.id + storyElement.splitIndex}
                                >
                                    {showStory.text}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};
