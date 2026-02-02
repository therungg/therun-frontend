import { useEffect, useState } from 'react';
import {
    SplitStory,
    Story,
    StoryWithSplitsStories,
    WebsocketStoryMessage,
} from '~app/(old-layout)/live/story.types';
import { useStoryWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import { getStoryByUser } from '~src/lib/stories';

const storyMessageIsValid = (
    message: WebsocketStoryMessage<Story | SplitStory>,
) => {
    return message !== null && message.data && message.storyId;
};

export const useStory = (user: string) => {
    const [storyState, setStoryState] = useState<StoryWithSplitsStories | null>(
        null,
    );

    const [hasStories, setHasStories] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const lastMessage = useStoryWebsocket(user);

    useEffect(() => {
        const fetchInitialStory = async () => {
            setStoryState(await getStoryByUser(user));
        };

        fetchInitialStory();
    }, [user]);

    useEffect(() => {
        if (storyState && storyMessageIsValid(lastMessage)) {
            const story = lastMessage.data as Story;
            if (lastMessage.type === 'story') {
                const newStory: StoryWithSplitsStories = {
                    ...story,
                    stories: [],
                };
                setStoryState(newStory);
            } else if (lastMessage.type === 'split') {
                if (lastMessage.storyId !== storyState.increment) {
                    console.log('This should not happen..');
                }

                const splitStory = lastMessage.data as SplitStory;

                const allSplitsStories = [...storyState.stories, splitStory];

                const newStory: StoryWithSplitsStories = {
                    ...storyState,
                    stories: allSplitsStories,
                };
                setStoryState(newStory);
            }
            setHasStories(true);
            setIsLoaded(true);
        }
    }, [lastMessage]);

    return {
        story: storyState,
        isLoaded,
        hasStories,
    };
};
