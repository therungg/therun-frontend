import { memo, useMemo } from "react";

interface ChatMessageTimeProps {
    time: string;
}

export const ChatMessageTime = memo<ChatMessageTimeProps>(({ time }) => {
    const title = useMemo(() => new Date(time).toLocaleTimeString(), [time]);
    const formattedTime = useMemo(() => {
        return new Date(time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }, [time]);

    return (
        <small suppressHydrationWarning title={title} className="text-nowrap">
            {formattedTime}
        </small>
    );
});

ChatMessageTime.displayName = "ChatMessageTime";
