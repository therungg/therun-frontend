export type SocialNetwork = 'twitch' | 'youtube' | 'twitter' | 'bluesky';

export interface SocialLink {
    network: SocialNetwork;
    label: string;
    href: string;
}

const PROFILE_URL: Record<SocialNetwork, (handle: string) => string> = {
    twitch: (h) => `https://twitch.tv/${h}`,
    youtube: (h) => `https://youtube.com/@${h}`,
    twitter: (h) => `https://x.com/${h}`,
    bluesky: (h) => `https://bsky.app/profile/${h}`,
};

const LABEL: Record<SocialNetwork, string> = {
    twitch: 'Twitch',
    youtube: 'YouTube',
    twitter: 'X',
    bluesky: 'Bluesky',
};

/**
 * Profile socials are free text: people type a handle ("@name", "name") or
 * paste a whole URL. A pasted http(s) URL is used as-is; anything else is
 * treated as a handle on that network. Nothing that isn't http(s) is ever
 * emitted as a link.
 */
function toHref(network: SocialNetwork, raw: string): string | null {
    const value = raw.trim();
    if (!value) return null;

    if (/^https?:\/\//i.test(value)) {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' || url.protocol === 'http:'
                ? url.toString()
                : null;
        } catch {
            return null;
        }
    }

    const handle = value.replace(/^@/, '');
    if (!/^[\w.-]+$/.test(handle)) return null;
    return PROFILE_URL[network](handle);
}

export function socialLinks(
    socials: Partial<Record<SocialNetwork, string>> | null | undefined,
): SocialLink[] {
    if (!socials) return [];
    const order: SocialNetwork[] = ['twitch', 'youtube', 'twitter', 'bluesky'];
    return order.flatMap((network) => {
        const raw = socials[network];
        const href = raw ? toHref(network, raw) : null;
        return href ? [{ network, label: LABEL[network], href }] : [];
    });
}
