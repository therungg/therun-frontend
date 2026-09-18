import { youtubeParser } from '~src/components/run/dashboard/vod';

export type PlaybackRate = 0.25 | 0.5 | 1 | 2;
export const PLAYBACK_RATES: PlaybackRate[] = [0.25, 0.5, 1, 2];

/** The bit of an embedded player the workbench needs. Time in seconds. */
export interface VodPlayer {
    ready: Promise<void>;
    /** Pauses, then seeks. */
    seek(seconds: number): void;
    play(): void;
    pause(): void;
    getTime(): number;
    setRate(rate: PlaybackRate): void;
    /** Twitch has no rate setter; the UI hides the control. */
    supportsRate: boolean;
    duration(): number | null;
    destroy(): void;
}

export type VodTarget =
    | { kind: 'youtube'; id: string }
    | { kind: 'twitch'; id: string };

export function detectVod(url: string): VodTarget | null {
    // Only try youtubeParser if the URL looks like it might be YouTube
    if (url.includes('youtu')) {
        const yt = youtubeParser(url);
        if (yt) return { kind: 'youtube', id: yt };
    }
    const tw = url.match(/twitch\.tv\/videos\/(\d+)/);
    if (tw) return { kind: 'twitch', id: tw[1] };
    return null;
}
