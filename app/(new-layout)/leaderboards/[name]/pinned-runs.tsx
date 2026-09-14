'use client';

import { useState } from 'react';
import { PlayFill } from 'react-bootstrap-icons';
import { VerificationBadge } from '~app/(new-layout)/games-v2/[game]/run-view/run-badges';
import { GameImage } from '~src/components/image/gameimage';
import { Vod, youtubeParser } from '~src/components/run/dashboard/vod';
import { formatEntryTime, formatProfileDate } from './format';
import styles from './leaderboards-profile.module.scss';
import { useShowcase } from './showcase-provider';
import {
    entryRef,
    type Pinned,
    pickVideoPin,
    pinKey,
    resolvePins,
    samePin,
} from './showcase-rules';

const MEDALS: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

function PinVideo({ vodUrl }: { vodUrl: string }) {
    const [playing, setPlaying] = useState(false);
    const youtubeId = youtubeParser(vodUrl);
    return (
        <div className={styles.featuredVideo}>
            {playing ? (
                <Vod vod={vodUrl} />
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
    );
}

export function PinCard({
    pin,
    video,
    children,
}: {
    pin: Pinned;
    video: boolean;
    children?: React.ReactNode;
}) {
    const { entry, game } = pin;
    const medal = entry.rank !== null ? MEDALS[entry.rank] : undefined;
    return (
        <article
            className={video ? `${styles.pin} ${styles.pinWide}` : styles.pin}
        >
            {video && entry.vodUrl ? <PinVideo vodUrl={entry.vodUrl} /> : null}
            <div className={styles.pinBody}>
                <GameImage
                    src={game.imageUrl ?? ''}
                    alt=""
                    quality="small"
                    width={48}
                    height={64}
                />
                <div className={styles.pinText}>
                    <span
                        className={
                            entry.rank !== null
                                ? styles.entryRank
                                : `${styles.entryRank} ${styles.entryRankNone}`
                        }
                        data-medal={medal}
                    >
                        {entry.rank !== null ? `#${entry.rank}` : '—'}
                    </span>
                    <span className={styles.pinTitle}>
                        {game.game} · {entry.category}
                        {entry.level ? ` · ${entry.level}` : ''}
                    </span>
                    <span className={styles.pinLine}>
                        <span className={styles.recentTime}>
                            {formatEntryTime(entry)}
                        </span>
                        {entry.runDate ? (
                            <span className={styles.recentDate}>
                                {formatProfileDate(entry.runDate)}
                            </span>
                        ) : null}
                        <VerificationBadge status={entry.status} />
                    </span>
                </div>
            </div>
            {children}
        </article>
    );
}

/** The showcase: the runner's pins, or the best run per game when none. */
export function PinnedRuns() {
    const { games, draft } = useShowcase();
    const pins = resolvePins(games, draft.pins);
    if (pins.length === 0) return null;
    const video = pickVideoPin(pins, draft.videoPin);
    return (
        <section className={styles.pins} aria-label="Pinned runs">
            {pins.map((pin) => (
                <PinCard
                    key={pinKey(entryRef(pin.entry))}
                    pin={pin}
                    video={
                        video !== null &&
                        samePin(entryRef(pin.entry), entryRef(video.entry))
                    }
                />
            ))}
        </section>
    );
}
