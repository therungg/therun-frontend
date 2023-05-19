import { useEffect, useState } from "react";
import { MarathonEvent } from "./send-marathon-data-button";
import { useReconnectWebsocket } from "../websocket/use-reconnect-websocket";

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

    const lastMessage = useReconnectWebsocket(`marathon-${session.username}`);

    useEffect(() => {
        if (lastMessage !== null) {
            const data = JSON.parse(lastMessage.data);

            if (data.time != currentMessage.time) {
                messages.push(data);
                setMessages(messages);
                setCurrentMessage(data);
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
