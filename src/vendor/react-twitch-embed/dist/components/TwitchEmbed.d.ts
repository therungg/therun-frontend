import React from 'react';
import { TwitchEmbedInstance, OnPlayData, OnAuthenticateData } from '../types';
export interface TwitchEmbedProps extends React.HTMLAttributes<HTMLDivElement> {
    allowFullscreen?: boolean;
    autoplay?: boolean;
    channel?: string;
    video?: string;
    collection?: string;
    withChat?: boolean;
    muted?: boolean;
    parent?: string | string[];
    darkMode?: boolean;
    time?: string;
    hideControls?: boolean;
    onAuthenticate?: (embed: TwitchEmbedInstance, data: OnAuthenticateData) => void;
    onVideoPlay?: (embed: TwitchEmbedInstance, data: OnPlayData) => void;
    onVideoPause?: (embed: TwitchEmbedInstance) => void;
    onVideoReady?: (embed: TwitchEmbedInstance) => void;
    id?: string;
    height?: string | number;
    width?: string | number;
}
declare const TwitchEmbed: React.FC<TwitchEmbedProps>;
export default TwitchEmbed;
//# sourceMappingURL=TwitchEmbed.d.ts.map