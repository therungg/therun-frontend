"use client";

import { LiveRun } from "~app/live/live.types";
import React, { useEffect, useState } from "react";
import { useLiveRunsWebsocket } from "~src/components/websocket/use-reconnect-websocket";
import { RunStoryView } from "~app/live/stories/run-story-view";

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
            if (lastMessage.type === "UPDATE") {
                setLiveRun(lastMessage.run);
            }

            if (lastMessage.type === "DELETE") {
                setLiveRun(undefined);
            }
        }
    }, [lastMessage]);

    if (!liveRun) {
        return <>No live run found for user {username}</>;
    }

    return <RunStoryView liveRun={liveRun} />;
};

export default ShowRunStory;
