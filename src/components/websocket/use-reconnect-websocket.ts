"use client";

import useWebSocket, { Options, ReadyState } from "react-use-websocket";
import { useEffect } from "react";
import { WebsocketLiveRunMessage } from "~app/(old-layout)/live/live.types";
import {
    Race,
    RaceMessage,
    RaceParticipant,
    WebsocketRaceMessage,
} from "~app/(old-layout)/races/races.types";
import {
    SplitStory,
    Story,
    WebsocketStoryMessage,
} from "~app/(old-layout)/live/story.types";

type WebsocketType = "username" | "race" | "story";

export const useLiveRunsWebsocket = <Message = WebsocketLiveRunMessage>(
    username?: string,
) => useReconnectWebsocket<Message>("username", username);

export const useAllRacesWebsocket = () =>
    useReconnectWebsocket<WebsocketRaceMessage<Race | RaceParticipant>>(
        "race",
        "all-races",
    );

export const useRaceWebsocket = (raceId: string) =>
    useReconnectWebsocket<
        WebsocketRaceMessage<Race | RaceParticipant | RaceMessage>
    >("race", raceId);

export const useStoryWebsocket = (user: string) =>
    useReconnectWebsocket<WebsocketStoryMessage<Story | SplitStory>>(
        "story",
        user,
    );

export const useReconnectWebsocket = <T>(
    type?: WebsocketType,
    value?: string | null,
): T => {
    const options: Options = {
        shouldReconnect: () => true,
        retryOnError: true,
        reconnectInterval: (attemptNumber) =>
            Math.min(Math.pow(2, attemptNumber) * 1000, 10000),
    };
    const pingIntervalMinutes = 9;
    let websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL as string;

    if (value) {
        websocketUrl += `?${type}=${value}`;
    }

    const { lastJsonMessage, sendMessage, readyState } = useWebSocket<T>(
        value !== null ? websocketUrl : null,
        options,
    );

    useEffect(() => {
        if (readyState === ReadyState.OPEN) {
            const interval = setInterval(
                () => sendMessage(""),
                pingIntervalMinutes * 60 * 1000,
            );

            return () => clearInterval(interval);
        }
    }, [readyState]);

    return lastJsonMessage;
};
