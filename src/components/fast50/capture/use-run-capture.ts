'use client';

import { useEffect, useState } from 'react';
import type { WebsocketLiveRunMessage } from '~app/(new-layout)/live/live.types';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import { saveCapture } from './capture-store';

export const useRunCapture = (
    username: string | null,
): { lastEvent: string | null } => {
    const [lastEvent, setLastEvent] = useState<string | null>(null);
    const message = useLiveRunsWebsocket<WebsocketLiveRunMessage>(
        username ?? undefined,
    );

    useEffect(() => {
        if (!username || !message || message.type !== 'UPDATE') return;
        if (message.user.toLowerCase() !== username.toLowerCase()) return;
        if (!message.run?.isMinified) {
            saveCapture(window.localStorage, message.run);
            setLastEvent(new Date().toISOString());
        }
    }, [message, username]);

    return { lastEvent };
};
