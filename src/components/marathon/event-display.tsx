import { useEffect, useState } from "react";
import { type MarathonEvent } from "./send-marathon-data-button";
import { useLiveRunsWebsocket } from "../websocket/use-reconnect-websocket";
import { WebsocketLiveRunMessage } from "~app/(old-layout)/live/live.types";

interface ReceivedEvent extends WebsocketLiveRunMessage {
    time: string;
    event: MarathonEvent;
}

export const EventDisplay = ({
    session,
}: {
    session: { username: string; id: string };
}) => {
    const [messages, setMessages] = useState<ReceivedEvent[]>([]);
    const [currentMessage, setCurrentMessage] = useState<ReceivedEvent>();

    const lastMessage = useLiveRunsWebsocket<ReceivedEvent>(
        `marathon-${session.username}`,
    );

    useEffect(() => {
        if (lastMessage !== null && lastMessage.time != currentMessage?.time) {
            messages.push(lastMessage);
            setMessages(messages);
            setCurrentMessage(lastMessage);
        }
    }, [lastMessage]);

    return (
        <div>
            {messages.length == 0 && (
                <div>No events sent yet, sent events will show up here.</div>
            )}
            {messages
                .slice()
                .reverse()
                .map((message) => {
                    return (
                        <div key={message.time}>
                            {message.event.name} {message.time}
                        </div>
                    );
                })}
        </div>
    );
};

export default EventDisplay;
