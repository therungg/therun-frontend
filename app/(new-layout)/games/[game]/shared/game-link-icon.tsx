import {
    BookHalf,
    Discord,
    Github,
    Globe2,
    type Icon,
    Stopwatch,
    Twitch,
    TwitterX,
    Youtube,
} from 'react-bootstrap-icons';

// Icon for a mod-configured game link, chosen by URL host first (labels are
// free text), label as fallback. Globe = generic "website for this game".
export function gameLinkIcon(label: string, url: string): Icon {
    let host = '';
    try {
        host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        // no URL yet (draft link) — fall through to label matching
    }
    const l = label.toLowerCase();

    if (host.endsWith('speedrun.com') || l === 'speedrun.com') return Stopwatch;
    if (host.endsWith('twitch.tv') || l === 'twitch') return Twitch;
    if (host.endsWith('discord.gg') || host.endsWith('discord.com'))
        return Discord;
    if (host.endsWith('youtube.com') || host.endsWith('youtu.be'))
        return Youtube;
    if (host.endsWith('twitter.com') || host === 'x.com') return TwitterX;
    if (host.endsWith('github.com')) return Github;
    if (
        host.endsWith('fandom.com') ||
        host.includes('wiki') ||
        l.includes('wiki')
    )
        return BookHalf;
    return Globe2;
}
