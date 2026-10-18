'use client';

import { useState } from 'react';
import { PlayFill } from 'react-bootstrap-icons';
import { youtubeParser } from '~src/lib/vod-url';
import styles from './vod.module.scss';

export const Vod = ({
    vod,
    immediate = false,
}: {
    vod: string;
    immediate?: boolean;
}) => {
    if (vod.includes('youtu')) {
        return <Youtube url={vod} />;
    }

    if (vod.includes('twitch')) {
        return <Twitch vod={vod} immediate={immediate} />;
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

    url = `https://www.youtube-nocookie.com/embed/${code}`;

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

const Twitch = ({ vod, immediate }: { vod: string; immediate: boolean }) => {
    const [load, setLoad] = useState(immediate);
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

    if (!load) {
        return (
            <button
                type="button"
                className={styles.facade}
                onClick={() => setLoad(true)}
            >
                <span className={styles.play}>
                    <PlayFill size={28} aria-hidden />
                </span>
                <span className={styles.label}>Play on Twitch</span>
                <span className={styles.note}>
                    Loads the Twitch player, which sets Twitch&apos;s cookies.
                </span>
            </button>
        );
    }

    const fullUrl = `https://player.twitch.tv/?video=${idAndStart}&parent=localhost&parent=therun.gg&autoplay=${immediate ? 'false' : 'true'}`;

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
