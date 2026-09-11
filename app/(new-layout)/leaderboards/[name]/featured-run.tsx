'use client';

import { useState } from 'react';
import { PlayFill } from 'react-bootstrap-icons';
import { Vod, youtubeParser } from '~src/components/run/dashboard/vod';
import type {
    LeaderboardsProfileEntry,
    LeaderboardsProfileGame,
} from '../../../../types/leaderboards-profile.types';
import { formatEntryTime, formatProfileDate } from './format';
import styles from './leaderboards-profile.module.scss';

/**
 * The runner's best video, click to play: only the YouTube thumbnail loads
 * up front, the player itself waits for the click.
 */
export function FeaturedRun({
    entry,
    game,
}: {
    entry: LeaderboardsProfileEntry & { vodUrl: string };
    game: Pick<LeaderboardsProfileGame, 'game'>;
}) {
    const [playing, setPlaying] = useState(false);
    const youtubeId = youtubeParser(entry.vodUrl);
    const subline = [
        entry.rank !== null ? `#${entry.rank}` : null,
        formatEntryTime(entry),
        entry.runDate ? formatProfileDate(entry.runDate) : null,
    ].filter(Boolean);

    return (
        <section className={styles.featured} aria-labelledby="profile-featured">
            <div>
                <h2 id="profile-featured" className={styles.cardTitle}>
                    {game.game} · {entry.category}
                    {entry.level ? ` · ${entry.level}` : ''}
                </h2>
                <div className={styles.featuredMeta}>{subline.join(' · ')}</div>
            </div>
            <div className={styles.featuredVideo}>
                {playing ? (
                    <Vod vod={entry.vodUrl} />
                ) : (
                    <>
                        {youtubeId ? (
                            <img
                                src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
                                alt=""
                                loading="lazy"
                                className={styles.featuredThumb}
                            />
                        ) : null}
                        <button
                            type="button"
                            className={styles.featuredPlay}
                            aria-label="Play video"
                            onClick={() => setPlaying(true)}
                        >
                            <PlayFill size={32} aria-hidden />
                        </button>
                    </>
                )}
            </div>
        </section>
    );
}
