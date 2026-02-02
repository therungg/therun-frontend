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

const youtubeParser = (url: string) => {
    const regExp =
        /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length == 11 ? match[7] : false;
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
