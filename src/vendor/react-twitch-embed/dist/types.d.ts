export interface OnPlayData {
    sessionId: string;
}
export interface OnSeekData {
    position: number;
}
export interface OnAuthenticateData {
    displayName: string;
    id: string;
    profileImageURL: string;
}
export interface PlayerQuality {
    bitrate: number;
    codecs: string;
    group: string;
    height: number;
    framerate?: number;
    isDefault: boolean;
    name: string;
    width: number;
}
export interface PlaybackStats {
    /**
     * The version of the Twitch video player backend.
     */
    backendVersion: string;
    /**
     * The size of the video buffer in seconds.
     */
    bufferSize: number;
    /**
     * Codecs currently in use, comma-separated (video,audio).
     */
    codecs: string;
    /**
     * The current size of the video player element (eg. 850x480).
     */
    displayResolution: string;
    /**
     * The video playback rate in frames per second. Not available on all browsers.
     */
    fps: number;
    /**
     * Current latency to the broadcaster in seconds. Only available for live content.
     */
    hlsLatencyBroadcaster: number;
    /**
     * The playback bitrate in Kbps.
     */
    playbackRate: number;
    /**
     * The number of dropped frames.
     */
    skippedFrames: number;
    /**
     * The native resolution of the current video (eg. 640x480).
     */
    videoResolution: string;
}
export interface PlayerState {
    channelID: string;
    channelName: string;
    collectionID: string;
    currentTime: number;
    duration: number;
    ended: boolean;
    muted: boolean;
    playback: 'Idle' | 'Ready' | 'Buffering' | 'Playing' | 'Ended';
    qualitiesAvailable: string[];
    quality: string;
    stats: {
        videoStats: PlaybackStats;
    };
    videoID: string;
    volume: number;
}
export interface TwitchPlayerInstance extends EventTarget {
    /**
     * Disables display of Closed Captions.
     */
    disableCaptions: () => void;
    /**
     * Enables display of Closed Captions. Note captions will only display if they are included in the video content being played.
     * See the CAPTIONS JavaScript Event for more info.
     */
    enableCaptions: () => void;
    /**
     * Pauses the player.
     */
    pause: () => void;
    /**
     * Begins playing the specified video.
     */
    play: () => void;
    /**
     * Seeks to the specified timestamp (in seconds) in the video. Does not work for live streams.
     */
    seek: (timestamp: number) => void;
    /**
     * Sets the channel to be played.
     * @param channel
     */
    setChannel: (channel: string) => void;
    /**
     * Sets the collection to be played.
     *
     * Optionally also specifies the video within the collection, from which to start playback.
     * If a video ID is not provided here or the specified video is not part of the collection
     * playback starts with the first video in the collection.
     * @param collection
     * @param videoId
     */
    setCollection: (collection: string, videoId?: string) => void;
    /**
     * Sets the quality of the video. quality should be a string value returned by getQualities.
     * @param quality
     */
    setQuality: (quality: string) => void;
    /**
     * Sets the video to be played to be played and starts playback at timestamp (in seconds).
     * @param video
     * @param timestamp
     */
    setVideo: (video: string, timestamp: number) => void;
    /**
     * Returns true if the player is muted; otherwise, false.
     */
    getMuted: () => boolean;
    /**
     * If true, mutes the player; otherwise, unmutes it. This is independent of the volume setting.
     * @param muted
     */
    setMuted: (muted: boolean) => void;
    /**
     * Returns the volume level, a value between 0.0 and 1.0.
     */
    getVolume: () => number;
    /**
     * Sets the volume to the specified volume level, a value between 0.0 and 1.0.
     * @param volumeLevel
     */
    setVolume: (volumeLevel: number) => void;
    /**
     * Returns an object with statistics on the embedded video player and the current live stream or VOD.
     * See below for more info.
     */
    getPlaybackStats: () => PlaybackStats;
    /**
     * Returns the channel’s name. Works only for live streams, not VODs.
     */
    getChannel: () => string | undefined;
    /**
     * Returns the current video’s timestamp, in seconds. Works only for VODs, not live streams.
     */
    getCurrentTime: () => number;
    /**
     * Returns the duration of the video, in seconds. Works only for VODs,not live streams.
     */
    getDuration: () => number;
    /**
     * Returns true if the live stream or VOD has ended; otherwise, false.
     */
    getEnded: () => boolean;
    /**
     * Returns the available video qualities. For example, chunked (pass-through of the original source).
     */
    getQualities: () => PlayerQuality[];
    /**
     * Returns the current quality of video playback.
     */
    getQuality: () => string;
    /**
     * Returns the video ID. Works only for VODs, not live streams.
     */
    getVideo: () => string | undefined;
    /**
     * Returns true if the video is paused; otherwise, false. Buffering or seeking is considered playing.
     */
    isPaused: () => boolean;
    /**
     * UNDOCUMENTED. Get the ID of the channel being played.
     */
    getChannelId: () => string | undefined;
    /**
     * UNDOCUMENTED. Get the collection being played.
     */
    getCollection: () => string | undefined;
    /**
     * UNDOCUMENTED. Get the current state of the player.
     */
    getPlayerState: () => PlayerState;
    /**
     * UNDOCUMENTED. Set the ID of the channel to play.
     * @param channelId
     */
    setChannelId: (channelId: string) => void;
    addEventListener: (event: string, callback: (...args: any[]) => void) => void;
}
export interface TwitchPlayerConstructorOptions {
    allowfullscreen?: boolean;
    autoplay?: boolean;
    channel?: string;
    collection?: string;
    controls?: boolean;
    height?: string | number;
    muted?: boolean;
    parent?: string[];
    playsinline?: boolean;
    time?: string;
    video?: string;
    width?: string | number;
}
export interface TwitchPlayerConstructor {
    new (id: string, options: TwitchPlayerConstructorOptions): TwitchPlayerInstance;
    /**
     * Closed captions are found in the video content being played.
     * This event will be emitted once for each new batch of captions,
     * in sync with the corresponding video content.
     * The event payload is a string containing the caption content.
     */
    CAPTIONS: string;
    /**
     * Video or stream ends.
     */
    ENDED: string;
    /**
     * Player is paused. Buffering and seeking is not considered paused.
     */
    PAUSE: string;
    /**
     * Player just unpaused, will either start video playback or start buffering.
     */
    PLAY: string;
    /**
     * Player playback was blocked. Usually fired after an unmuted autoplay or unmuted programmatic call on play().
     */
    PLAYBACK_BLOCKED: string;
    /**
     * Player started video playback.
     */
    PLAYING: string;
    /**
     * Loaded channel goes offline.
     */
    OFFLINE: string;
    /**
     * Loaded channel goes online.
     */
    ONLINE: string;
    /**
     * Player is ready to accept function calls.
     */
    READY: string;
    /**
     * User has used the player controls to seek a VOD, the seek() method has been called,
     * or live playback has seeked to sync up after being paused.
     */
    SEEK: string;
}
export interface TwitchEmbedInstance extends TwitchPlayerInstance {
    /**
     * To provide additional functionality to our API, access specific components with getPlayer(),
     * which retrieves the current video player instance from the embed and provides full programmatic access to the video player API.
     */
    getPlayer: () => TwitchPlayerInstance;
}
export interface TwitchEmbedConstructorOptions {
    allowfullscreen?: boolean;
    autoplay?: boolean;
    channel?: string;
    collection?: string;
    controls?: boolean;
    height?: string | number;
    layout?: 'video-with-chat' | 'video';
    muted?: boolean;
    parent?: string[] | null;
    theme?: 'light' | 'dark';
    time?: string;
    video?: string;
    width?: string | number;
}
export interface TwitchEmbedConstructor {
    new (id: string, options: TwitchEmbedConstructorOptions): TwitchEmbedInstance;
    /**
     * UNDOCUMENTED. The embed instance has been authenticated with the user's stored credentials.
     * This callback receives an object with displayName, id and profileImageURL properties.
     */
    AUTHENTICATE: string;
    /**
     * The video started playing. This callback receives an object with a sessionId property.
     */
    VIDEO_PLAY: string;
    /**
     * UNDOCUMENTED. The video player has been paused.
     */
    VIDEO_PAUSE: string;
    /**
     * The video player is ready for API commands.
     */
    VIDEO_READY: string;
}
export interface TwitchWindow extends Window {
    Twitch?: {
        Embed?: TwitchEmbedConstructor;
        Player?: TwitchPlayerConstructor;
    };
}
//# sourceMappingURL=types.d.ts.map