import { cacheLife, cacheTag } from 'next/cache';

/** The numeric video id of a twitch.tv/videos/<id> link, or null. */
export function twitchVideoId(url: string): string | null {
    const match = url.match(/twitch\.tv\/videos\/(\d+)/);
    return match ? match[1] : null;
}

async function getAppToken(): Promise<string | null> {
    'use cache';
    // App tokens last around two months; refreshing daily keeps well inside that.
    cacheLife('days');
    cacheTag('twitch-app-token');
    const clientId = process.env.NEXT_PUBLIC_TWITCH_OAUTH_CLIENT_ID;
    const secret = process.env.TWITCH_OAUTH_SECRET;
    if (!clientId || !secret) return null;
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: secret,
            grant_type: 'client_credentials',
        }),
    });
    // Throw rather than return null: a failure must not be cached for days.
    if (!res.ok) throw new Error(`Twitch token ${res.status}`);
    const json = (await res.json()) as { access_token?: string };
    return json.access_token ?? null;
}

/**
 * The thumbnail of a Twitch VOD at 640×360, or null when the video is gone
 * or still processing. Cached for days per video; throws when Twitch can't be
 * reached, so a failure isn't cached.
 */
export async function getTwitchVodThumbnail(
    videoId: string,
): Promise<string | null> {
    'use cache';
    cacheLife('days');
    cacheTag(`twitch-vod-thumb:${videoId}`);
    const token = await getAppToken();
    const clientId = process.env.NEXT_PUBLIC_TWITCH_OAUTH_CLIENT_ID;
    if (!token || !clientId) return null;
    const res = await fetch(
        `https://api.twitch.tv/helix/videos?id=${encodeURIComponent(videoId)}`,
        {
            headers: {
                'Client-ID': clientId,
                Authorization: `Bearer ${token}`,
            },
        },
    );
    if (!res.ok) throw new Error(`Twitch videos ${res.status}`);
    const json = (await res.json()) as {
        data?: { thumbnail_url?: string }[];
    };
    const template = json.data?.[0]?.thumbnail_url;
    // A VOD still processing has an empty thumbnail or Twitch's 404 image.
    if (!template || template.includes('404_processing')) return null;
    return template.replace('%{width}', '640').replace('%{height}', '360');
}
