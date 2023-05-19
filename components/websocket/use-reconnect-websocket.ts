import useWebSocket, { Options, ReadyState } from "react-use-websocket";
import { useEffect } from "react";

export const useReconnectWebsocket = (username?: string) => {
    const options: Options = {
        shouldReconnect: () => true,
        retryOnError: true,
        reconnectInterval: (attemptNumber) =>
            Math.min(Math.pow(2, attemptNumber) * 1000, 10000),
    };
    const pingIntervalMinutes = 9;
    let websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL as string;

    if (username) {
        websocketUrl += `?username=${username}`;
    }

    const { lastMessage, sendMessage, readyState } = useWebSocket(
        websocketUrl,
        options
    );

    useEffect(() => {
        if (readyState === ReadyState.OPEN) {
            const interval = setInterval(
                () => sendMessage(""),
                pingIntervalMinutes * 60 * 1000
            );

            return () => clearInterval(interval);
        }
    }, [readyState]);

    return lastMessage;
};
