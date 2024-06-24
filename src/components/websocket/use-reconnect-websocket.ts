import useWebSocket, { Options, ReadyState } from "react-use-websocket";
import { useEffect } from "react";
import { WebsocketLiveRunMessage } from "~app/live/live.types";
import {
    Race,
    RaceMessage,
    RaceParticipant,
    WebsocketRaceMessage,
} from "~app/races/races.types";
import { User } from "../../../types/session.types";

type WebsocketType = "liveRun" | "race";

export const useLiveRunsWebsocket = <Message = WebsocketLiveRunMessage>(
    username?: string,
) => useReconnectWebsocket<Message>("liveRun", username);

export const useAllRacesWebsocket = () =>
    useReconnectWebsocket<WebsocketRaceMessage<Race | RaceParticipant>>(
        "race",
        "all-races",
    );

export const useRaceWebsocket = (raceId: string) =>
    useReconnectWebsocket<
        WebsocketRaceMessage<Race | RaceParticipant | RaceMessage>
    >("race", raceId);

export const useUserRaceParticipationsWebsocket = (user: User | undefined) =>
    useReconnectWebsocket<WebsocketRaceMessage<RaceParticipant>>(
        "race",
        user ? `${user.username}-races` : null,
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
        const queryType = type === "liveRun" ? "username" : "race";
        websocketUrl += `?${queryType}=${value}`;
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
