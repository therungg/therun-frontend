const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_PATH_PREFIXES = new Set(['embed', 'shorts', 'live', 'v', 'e']);

/**
 * The video id of a YouTube link, or false. Parsed as a URL rather than
 * matched loosely: the old pattern's optional `v=` ate the first character of
 * any id starting with "v", so one YouTube video in 64 never played.
 */
export const youtubeParser = (url: string): string | false => {
    let parsed: URL;
    try {
        parsed = new URL(
            /^https?:\/\//i.test(url.trim())
                ? url.trim()
                : `https://${url.trim()}`,
        );
    } catch {
        return false;
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const segments = parsed.pathname.split('/').filter(Boolean);
    let id: string | null = null;
    if (host === 'youtu.be') {
        id = segments[0] ?? null;
    } else if (
        host === 'youtube.com' ||
        host.endsWith('.youtube.com') ||
        host === 'youtube-nocookie.com'
    ) {
        id =
            parsed.searchParams.get('v') ??
            (segments.length >= 2 && YOUTUBE_PATH_PREFIXES.has(segments[0])
                ? segments[1]
                : null);
    }
    return id && YOUTUBE_ID.test(id) ? id : false;
};

/**
 * Whether `<Vod>` can actually embed this link. It only speaks YouTube and
 * Twitch; everything else has to fall back to a plain link, and a caller that
 * skips this check renders an empty player well.
 */
export function isEmbeddableVod(url: string): boolean {
    return Boolean(youtubeParser(url)) || url.includes('twitch');
}

/** Where the video lives: "YouTube", "Twitch", "Video", or null for none. */
export function videoSource(url: string | null): string | null {
    if (!url) return null;
    let host: string;
    try {
        host = new URL(url).hostname.toLowerCase();
    } catch {
        return 'Video';
    }
    if (/(^|\.)youtube\.com$/.test(host) || host === 'youtu.be')
        return 'YouTube';
    if (/(^|\.)twitch\.tv$/.test(host)) return 'Twitch';
    return 'Video';
}

export type VodUrlCheck =
    | { ok: true; url: string }
    | { ok: false; error: string };

/**
 * Normalize a pasted video link before it's stored on a run. Deliberately
 * permissive about the host — moderators paste Twitch, YouTube, Google Drive,
 * a personal archive — and strict only about it being a real http(s) URL, so
 * the stored value is always something a browser can open.
 */
export function normalizeVodUrl(raw: string): VodUrlCheck {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: false, error: 'Paste a video link first.' };

    // A bare "twitch.tv/videos/1" is what people actually paste out of a
    // chat message; assume https rather than rejecting it.
    const withScheme = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;

    let parsed: URL;
    try {
        parsed = new URL(withScheme);
    } catch {
        return { ok: false, error: "That doesn't look like a link." };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { ok: false, error: 'Only http and https links can be saved.' };
    }
    if (!parsed.hostname.includes('.')) {
        return { ok: false, error: "That doesn't look like a link." };
    }
    return { ok: true, url: parsed.toString() };
}

export function videoList(run: {
    vodUrl?: string | null;
    vodUrls?: string[] | null;
}): string[] {
    const all = [run.vodUrl, ...(run.vodUrls ?? [])];
    return [...new Set(all.filter((u): u is string => !!u))];
}
