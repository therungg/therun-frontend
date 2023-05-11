import React from 'react';
import { TwitchPlayerInstance, OnPlayData, OnSeekData } from '../types';
export interface TwitchPlayerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onEnded' | 'onPause' | 'onPlay' | 'onPlaying'> {
    channel?: string;
    video?: string;
    collection?: string;
    parent?: string | string[];
    autoplay?: boolean;
    muted?: boolean;
    time?: string;
    allowFullscreen?: boolean;
    playsInline?: boolean;
    hideControls?: boolean;
    onCaptions?: (player: TwitchPlayerInstance, captions: string) => void;
    onEnded?: (player: TwitchPlayerInstance) => void;
    onPause?: (player: TwitchPlayerInstance) => void;
    onPlay?: (player: TwitchPlayerInstance, data: OnPlayData) => void;
    onPlaybackBlocked?: (player: TwitchPlayerInstance) => void;
    onPlaying?: (player: TwitchPlayerInstance) => void;
    onOffline?: (player: TwitchPlayerInstance) => void;
    onOnline?: (player: TwitchPlayerInstance) => void;
    onReady?: (player: TwitchPlayerInstance) => void;
    onSeek?: (player: TwitchPlayerInstance, data: OnSeekData) => void;
    id?: string;
    height?: string | number;
    width?: string | number;
}
declare const TwitchPlayer: React.FC<TwitchPlayerProps>;
export default TwitchPlayer;
//# sourceMappingURL=TwitchPlayer.d.ts.map