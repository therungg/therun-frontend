import { youtubeParser } from '~src/components/run/dashboard/vod';

/**
 * Whether `<Vod>` can actually embed this link. It only speaks YouTube and
 * Twitch; everything else has to fall back to a plain link, and a caller that
 * skips this check renders an empty player well.
 */
export function isEmbeddableVod(url: string): boolean {
    return Boolean(youtubeParser(url)) || url.includes('twitch');
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
