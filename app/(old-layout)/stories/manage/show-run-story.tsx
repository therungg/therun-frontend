'use client';

import React, { useEffect, useState } from 'react';
import { LiveRun } from '~app/(old-layout)/live/live.types';
import { RunStoryView } from '~app/(old-layout)/live/stories/run-story-view';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';

const ShowRunStory = ({
    username,
    liveData,
}: {
    username: string;
    liveData: LiveRun;
}) => {
    const [liveRun, setLiveRun] = useState<LiveRun | undefined>(liveData);

    const lastMessage = useLiveRunsWebsocket(username);

    useEffect(() => {
        if (lastMessage !== null) {
            if (lastMessage.type === 'UPDATE') {
                setLiveRun(lastMessage.run);
            }

            if (lastMessage.type === 'DELETE') {
                setLiveRun(undefined);
            }
        }
    }, [lastMessage]);

    if (!liveRun) {
        return <></>;
    }

    return <RunStoryView liveRun={liveRun} />;
};

export default ShowRunStory;
