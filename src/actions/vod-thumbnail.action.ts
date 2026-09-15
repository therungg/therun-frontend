'use server';

import {
    getTwitchVodThumbnail,
    twitchVideoId,
} from '~src/lib/twitch-vod-thumbnail';

/** A preview image for a Twitch VOD link, or null. */
export async function getTwitchVodThumbnailAction(
    vodUrl: string,
): Promise<string | null> {
    const id = typeof vodUrl === 'string' ? twitchVideoId(vodUrl) : null;
    if (!id) return null;
    return getTwitchVodThumbnail(id).catch(() => null);
}
