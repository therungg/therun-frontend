"use client";

import { StoryWithSplitsStories } from "~app/live/story.types";

export const ShowRunStory = ({ story }: { story: StoryWithSplitsStories }) => {
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
