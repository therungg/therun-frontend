'use client';

import { useEffect, useState } from 'react';
import { StoryWithSplitsStories } from '~app/(new-layout)/live/story.types';
import { getStoryByUser } from '~src/lib/stories';

export interface StoryCandidatesState {
    story: StoryWithSplitsStories | null;
    isLoading: boolean;
    error: string | null;
}

export const useStoryCandidates = (
    user: string | null,
): StoryCandidatesState => {
    const [state, setState] = useState<StoryCandidatesState>({
        story: null,
        isLoading: false,
        error: null,
    });

    useEffect(() => {
        if (!user) {
            setState({ story: null, isLoading: false, error: null });
            return;
        }
        let cancelled = false;
        setState((s) => ({ ...s, isLoading: true, error: null }));

        getStoryByUser(user, true)
            .then((story) => {
                if (cancelled) return;
                setState({
                    story: story ?? null,
                    isLoading: false,
                    error: null,
                });
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setState({
                    story: null,
                    isLoading: false,
                    error:
                        e instanceof Error
                            ? e.message
                            : 'Story candidates unavailable.',
                });
            });

        return () => {
            cancelled = true;
        };
    }, [user]);

    return state;
};
