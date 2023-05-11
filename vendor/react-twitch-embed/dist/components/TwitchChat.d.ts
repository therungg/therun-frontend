import React from 'react';
export interface TwitchChatProps extends React.HTMLAttributes<HTMLIFrameElement> {
    channel: string;
    parent?: string | string[];
    darkMode?: boolean;
    title?: string;
    height?: string | number;
    width?: string | number;
}
declare const TwitchChat: React.FC<TwitchChatProps>;
export default TwitchChat;
//# sourceMappingURL=TwitchChat.d.ts.map