export const Vod = ({ vod }: { vod: string }) => {
    if (vod.includes('youtu')) {
        return <Youtube url={vod} />;
    }

    if (vod.includes('twitch')) {
        return <Twitch vod={vod} />;
    }

    return null;
};

const Youtube = ({ url }: { url: string }) => {
    let code = youtubeParser(url);

    const hasStart = url.split('start=');

    if (hasStart.length > 1) {
        const start = hasStart[1].split('&')[0];
        code += `?start=${start}`;
    }

    url = `https://youtube.com/embed/${code}`;

    return (
        <div
            style={{
                display: 'flex',
                overflow: 'hidden',
                flexDirection: 'column',
                alignContent: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
            }}
        >
            <iframe
                frameBorder="0"
                style={{ flexGrow: '100%' }}
                height="100%"
                src={url}
                title="Speedrun"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            ></iframe>
        </div>
    );
};

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

const Twitch = ({ vod }: { vod: string }) => {
    const split = vod.split('/videos/');
    if (split.length != 2)
        return (
            <div style={{ color: 'red' }}>
                The video url seems incorrect... Please insert a link like
                https://www.twitch.tv/videos/40861387
            </div>
        );

    let idAndStart = split[1];

    if (!idAndStart.includes('t=')) {
        idAndStart += '&t=0h0m0s';
    }

    idAndStart = idAndStart.replace('?t=', '&time=');

    const fullUrl = `https://player.twitch.tv/?video=${idAndStart}&parent=localhost&parent=therun.gg&autoplay=false`;

    return (
        <div
            style={{
                display: 'flex',
                overflow: 'hidden',
                flexDirection: 'column',
                alignContent: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
            }}
        >
            <iframe
                style={{ flexGrow: '100%' }}
                height="100%"
                src={fullUrl}
                frameBorder="0"
                allowFullScreen={true}
                scrolling="no"
            ></iframe>
        </div>
    );
};
