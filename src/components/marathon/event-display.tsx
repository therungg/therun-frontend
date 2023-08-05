import { useEffect, useState } from "react";
import { MarathonEvent } from "./send-marathon-data-button";
import { useLiveRunsWebsocket } from "../websocket/use-reconnect-websocket";

interface ReceivedEvent {
    time: string;
    event: MarathonEvent;
}

export const EventDisplay = ({
    session,
}: {
    session: { username: string; id: string };
}) => {
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");

    const lastMessage = useLiveRunsWebsocket(`marathon-${session.username}`);

    useEffect(() => {
        if (lastMessage !== null) {
            if (lastMessage.time != currentMessage.time) {
                messages.push(lastMessage);
                setMessages(messages);
                setCurrentMessage(lastMessage);
            }
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
                .map((message: ReceivedEvent) => {
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
