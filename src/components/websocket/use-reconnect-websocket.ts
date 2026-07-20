'use client';

import { useEffect } from 'react';
import useWebSocket, { Options, ReadyState } from 'react-use-websocket';
import { WebsocketLiveRunMessage } from '~app/(new-layout)/live/live.types';
import {
    SplitStory,
    Story,
    WebsocketStoryMessage,
} from '~app/(new-layout)/live/story.types';
import {
    Race,
    RaceMessage,
    RaceParticipant,
    WebsocketRaceMessage,
} from '~app/(new-layout)/races/races.types';
import { buildLiveWebsocketUrl } from './websocket-url';

type WebsocketType = 'username' | 'race' | 'story';

export const useLiveRunsWebsocket = <Message = WebsocketLiveRunMessage>(
    username?: string | null,
) => useReconnectWebsocket<Message>('username', username);

// Without a game this is the sitewide firehose; with one, the connection only
// receives that game's (optionally that category's) run updates.
export const useGameLiveRunsWebsocket = (
    game?: string | null,
    category?: string | null,
) =>
    useWebsocketConnection<WebsocketLiveRunMessage>(
        buildLiveWebsocketUrl(
            process.env.NEXT_PUBLIC_WEBSOCKET_URL as string,
            game,
            category,
        ),
    );

export const useAllRacesWebsocket = () =>
    useReconnectWebsocket<WebsocketRaceMessage<Race | RaceParticipant>>(
        'race',
        'all-races',
    );

export const useRaceWebsocket = (raceId: string) =>
    useReconnectWebsocket<
        WebsocketRaceMessage<Race | RaceParticipant | RaceMessage>
    >('race', raceId);

export const useStoryWebsocket = (user: string) =>
    useReconnectWebsocket<WebsocketStoryMessage<Story | SplitStory>>(
        'story',
        user,
    );

export const useReconnectWebsocket = <T>(
    type?: WebsocketType,
    value?: string | null,
): T => {
    let websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL as string;

    if (value) {
        websocketUrl += `?${type}=${value}`;
    }

    return useWebsocketConnection<T>(value !== null ? websocketUrl : null);
};

const useWebsocketConnection = <T>(url: string | null): T => {
    const options: Options = {
        shouldReconnect: () => true,
        retryOnError: true,
        reconnectInterval: (attemptNumber) =>
            Math.min(Math.pow(2, attemptNumber) * 1000, 10000),
    };
    const pingIntervalMinutes = 9;

    const { lastJsonMessage, sendMessage, readyState } = useWebSocket<T>(
        url,
        options,
    );

    useEffect(() => {
        if (readyState === ReadyState.OPEN) {
            const interval = setInterval(
                () => sendMessage(''),
                pingIntervalMinutes * 60 * 1000,
            );

            return () => clearInterval(interval);
        }
    }, [readyState]);

    return lastJsonMessage;
};
