import type { PlaybackRate, VodPlayer } from './types';

// Minimal typing of the parts of the IFrame API we use.
interface YTPlayerLike {
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    playVideo(): void;
    pauseVideo(): void;
    getCurrentTime(): number;
    getDuration(): number;
    setPlaybackRate(rate: number): void;
    destroy(): void;
}
interface YTNamespace {
    Player: new (
        el: HTMLElement,
        opts: {
            videoId: string;
            playerVars: Record<string, string | number>;
            events: { onReady: () => void; onError: (e: unknown) => void };
        },
    ) => YTPlayerLike;
}
declare global {
    interface Window {
        YT?: YTNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Load https://www.youtube.com/iframe_api once per page. */
function loadYouTubeApi(): Promise<YTNamespace> {
    if (typeof window === 'undefined')
        return Promise.reject(new Error('no window'));
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prev?.();
            if (window.YT) resolve(window.YT);
            else reject(new Error('YT missing after ready'));
        };
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.async = true;
        s.onerror = () => {
            apiPromise = null;
            reject(new Error('Could not load the YouTube player.'));
        };
        document.head.appendChild(s);
    });
    return apiPromise;
}

export function createYouTubePlayer(
    el: HTMLElement,
    videoId: string,
): VodPlayer {
    let player: YTPlayerLike | null = null;
    const ready = loadYouTubeApi().then(
        (YT) =>
            new Promise<void>((resolve, reject) => {
                player = new YT.Player(el, {
                    videoId,
                    playerVars: {
                        enablejsapi: 1,
                        origin: window.location.origin,
                        rel: 0,
                        controls: 1,
                        playsinline: 1,
                    },
                    events: {
                        onReady: () => resolve(),
                        onError: () =>
                            reject(
                                new Error(
                                    'The YouTube player refused this video.',
                                ),
                            ),
                    },
                });
            }),
    );
    return {
        ready,
        supportsRate: true,
        seek(seconds) {
            player?.pauseVideo();
            player?.seekTo(Math.max(0, seconds), true);
        },
        play: () => player?.playVideo(),
        pause: () => player?.pauseVideo(),
        getTime: () => player?.getCurrentTime() ?? 0,
        setRate: (rate: PlaybackRate) => player?.setPlaybackRate(rate),
        duration: () => {
            const d = player?.getDuration() ?? 0;
            return d > 0 ? d : null;
        },
        destroy: () => {
            player?.destroy();
            player = null;
        },
    };
}
