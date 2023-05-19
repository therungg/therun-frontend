import React from 'react';
export interface TwitchClipProps extends React.HTMLAttributes<HTMLIFrameElement> {
    clip: string;
    parent?: string | string[];
    autoplay?: boolean;
    muted?: boolean;
    title?: string;
    height?: string | number;
    width?: string | number;
}
declare const TwitchClip: React.FC<TwitchClipProps>;
export default TwitchClip;
//# sourceMappingURL=TwitchClip.d.ts.map