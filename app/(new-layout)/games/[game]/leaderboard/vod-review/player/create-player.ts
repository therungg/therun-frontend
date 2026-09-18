import { createTwitchPlayer } from './twitch';
import { detectVod, type VodPlayer } from './types';
import { createYouTubePlayer } from './youtube';

export type PlayerFactory = (el: HTMLElement, url: string) => VodPlayer | null;

export const createVodPlayer: PlayerFactory = (el, url) => {
    const target = detectVod(url);
    if (!target) return null;
    return target.kind === 'youtube'
        ? createYouTubePlayer(el, target.id)
        : createTwitchPlayer(el, target.id);
};
