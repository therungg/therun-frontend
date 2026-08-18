import type { VodPlayer } from './types';

interface TwitchPlayerLike {
    seek(seconds: number): void;
    play(): void;
    pause(): void;
    getCurrentTime(): number;
    getDuration(): number;
    addEventListener(event: string, cb: () => void): void;
    destroy?: () => void;
}
interface TwitchNamespace {
    Player: (new (
        el: HTMLElement,
        opts: {
            video: string;
            parent: string[];
            autoplay: boolean;
            width: string;
            height: string;
        },
    ) => TwitchPlayerLike) & { READY: string };
}
declare global {
    interface Window {
        Twitch?: TwitchNamespace;
    }
}

let apiPromise: Promise<TwitchNamespace> | null = null;

function loadTwitchApi(): Promise<TwitchNamespace> {
    if (typeof window === 'undefined')
        return Promise.reject(new Error('no window'));
    if (window.Twitch?.Player) return Promise.resolve(window.Twitch);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://player.twitch.tv/js/embed/v1.js';
        s.async = true;
        s.onload = () =>
            window.Twitch
                ? resolve(window.Twitch)
                : reject(new Error('Twitch missing after load'));
        s.onerror = () => {
            apiPromise = null;
            reject(new Error('Could not load the Twitch player.'));
        };
        document.head.appendChild(s);
    });
    return apiPromise;
}

export function createTwitchPlayer(
    el: HTMLElement,
    videoId: string,
): VodPlayer {
    let player: TwitchPlayerLike | null = null;
    // Construction is async (the embed script has to load first). If destroy()
    // runs before that — React StrictMode's mount→cleanup→mount does exactly
    // this — the late `.then` must NOT still build a player into `el`: it would
    // be an orphan iframe nobody controls, sitting on top of the real one, so
    // seeks go to the hidden player and the visible video never moves.
    let destroyed = false;
    const ready = loadTwitchApi().then(
        (Twitch) =>
            new Promise<void>((resolve) => {
                if (destroyed) return;
                player = new Twitch.Player(el, {
                    video: videoId,
                    // Same allow-list vod.tsx uses, plus wherever we're actually
                    // running (preview deploys, LAN dev hosts).
                    parent: Array.from(
                        new Set([
                            'localhost',
                            'therun.gg',
                            window.location.hostname,
                        ]),
                    ),
                    autoplay: false,
                    width: '100%',
                    height: '100%',
                });
                player.addEventListener(Twitch.Player.READY, () => resolve());
            }),
    );
    return {
        ready,
        supportsRate: false,
        seek(seconds) {
            player?.pause();
            player?.seek(Math.max(0, seconds));
        },
        play: () => player?.play(),
        pause: () => player?.pause(),
        getTime: () => player?.getCurrentTime() ?? 0,
        setRate: () => {
            // Twitch doesn't support playback rate changes
        },
        duration: () => {
            const d = player?.getDuration() ?? 0;
            return d > 0 ? d : null;
        },
        destroy: () => {
            destroyed = true;
            player?.destroy?.();
            el.replaceChildren();
            player = null;
        },
    };
}
