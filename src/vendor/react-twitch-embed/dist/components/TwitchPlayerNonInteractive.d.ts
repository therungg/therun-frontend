import React from 'react';
export interface TwitchPlayerNonInteractiveProps extends React.HTMLAttributes<HTMLIFrameElement> {
    parent?: string | string[];
    channel?: string;
    video?: string;
    collection?: string;
    autoplay?: boolean;
    muted?: boolean;
    time?: string;
    title?: string;
    height?: string | number;
    width?: string | number;
}
declare const TwitchPlayerNonInteractive: React.FC<TwitchPlayerNonInteractiveProps>;
export default TwitchPlayerNonInteractive;
//# sourceMappingURL=TwitchPlayerNonInteractive.d.ts.map