'use client';

import { useEffect, useState } from 'react';
import type { WebsocketLiveRunMessage } from '~app/(new-layout)/live/live.types';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import { saveCapture } from './capture-store';

export const useRunCapture = (
    username: string | null,
): { lastEvent: string | null } => {
    const [lastEvent, setLastEvent] = useState<string | null>(null);
    const message = useLiveRunsWebsocket<WebsocketLiveRunMessage>(username);

    useEffect(() => {
        if (!username || !message || message.type !== 'UPDATE') return;
        if (message.user.toLowerCase() !== username.toLowerCase()) return;
        if (!message.run?.isMinified) {
            try {
                const captured = saveCapture(window.localStorage, message.run);
                setLastEvent(captured.savedAt);
            } catch (err) {
                console.warn('fast50: failed to save capture', err);
            }
        }
    }, [message, username]);

    return { lastEvent };
};
