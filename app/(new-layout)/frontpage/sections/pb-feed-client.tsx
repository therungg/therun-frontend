'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { UserLink } from '~src/components/links/links';
import {
    DurationToFormatted,
    FromNow,
    getFormattedString,
} from '~src/components/util/datetime';
import type { FinishedRunPB } from '~src/lib/highlights';
import styles from './pb-feed.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';
const ROTATE_INTERVAL = 8000;
const FEATURED_COUNT = 3;

interface PbFeedClientProps {
    pbs: FinishedRunPB[];
    gameImages: Record<string, string>;
}

export const PbFeedClient = ({ pbs, gameImages }: PbFeedClientProps) => {
    const featured = pbs.slice(0, FEATURED_COUNT);
    const rest = pbs.slice(FEATURED_COUNT);

    return (
        <Panel title="Personal Bests" subtitle="Recent PBs" className="p-0">
            <FeaturedCarousel pbs={featured} gameImages={gameImages} />
            {rest.length > 0 && (
                <div className={styles.listContainer}>
                    {rest.map((pb) => (
                        <CompactItem
                            key={pb.id}
                            pb={pb}
                            imageUrl={gameImages[pb.game] ?? FALLBACK_IMAGE}
                        />
                    ))}
                </div>
            )}
        </Panel>
    );
};

const FeaturedCarousel = ({
    pbs,
    gameImages,
}: {
    pbs: FinishedRunPB[];
    gameImages: Record<string, string>;
}) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const pausedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

    const startTimer = () => {
        clearInterval(timerRef.current);
        if (pbs.length <= 1) return;
        timerRef.current = setInterval(() => {
            if (!pausedRef.current) {
                setActiveIndex((i) => (i + 1) % pbs.length);
            }
        }, ROTATE_INTERVAL);
    };

    useEffect(() => {
        startTimer();
        return () => clearInterval(timerRef.current);
    }, [pbs.length]);

    const goToSlide = (index: number) => {
        setActiveIndex(index);
        startTimer();
    };

    return (
        <div
            className={styles.featured}
            onMouseEnter={() => {
                pausedRef.current = true;
            }}
            onMouseLeave={() => {
                pausedRef.current = false;
            }}
        >
            {pbs.map((pb, i) => {
                const imageUrl = gameImages[pb.game] ?? FALLBACK_IMAGE;
                const improvement =
                    pb.previousPb !== null ? pb.previousPb - pb.time : null;
                const hasImprovement = improvement !== null && improvement > 0;

                return (
                    <div
                        key={pb.id}
                        className={`${styles.featuredSlide} ${i === activeIndex ? styles.featuredSlideActive : ''}`}
                    >
                        <img
                            src={imageUrl}
                            alt=""
                            className={styles.featuredArt}
                        />
                        <div className={styles.featuredContent}>
                            <span className={styles.featuredRunner}>
                                <UserLink username={pb.username} />
                            </span>
                            <span className={styles.featuredGameCategory}>
                                {pb.game} &middot; {pb.category}
                            </span>
                            <div className={styles.featuredTimeRow}>
                                <span className={styles.featuredTime}>
                                    <DurationToFormatted duration={pb.time} />
                                </span>
                                {hasImprovement ? (
                                    <span className={styles.featuredDelta}>
                                        -
                                        {getFormattedString(
                                            improvement.toString(),
                                            improvement < 60000,
                                        )}
                                    </span>
                                ) : pb.previousPb === null ? (
                                    <span className={styles.featuredFirstPb}>
                                        First PB!
                                    </span>
                                ) : null}
                            </div>
                            <span className={styles.featuredTimestamp}>
                                <FromNow time={pb.endedAt} />
                            </span>
                        </div>
                    </div>
                );
            })}
            {pbs.length > 1 && (
                <div className={styles.dots}>
                    {pbs.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
                            onClick={() => goToSlide(i)}
                            aria-label={`Show PB ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const CompactItem = ({
    pb,
    imageUrl,
}: {
    pb: FinishedRunPB;
    imageUrl: string;
}) => {
    const improvement = pb.previousPb !== null ? pb.previousPb - pb.time : null;
    const hasImprovement = improvement !== null && improvement > 0;

    return (
        <div className={styles.listItem}>
            <Image
                src={imageUrl}
                alt={pb.game}
                width={40}
                height={40}
                className={styles.listGameIcon}
                unoptimized
            />
            <div className={styles.listInfo}>
                <span className={styles.listRunnerName}>
                    <UserLink username={pb.username} />
                </span>
                <span className={styles.listGameCategory}>
                    {pb.game} &middot; {pb.category}
                </span>
            </div>
            <div className={styles.listRight}>
                <span className={styles.listTime}>
                    <DurationToFormatted duration={pb.time} />
                </span>
                {hasImprovement ? (
                    <span className={styles.listDelta}>
                        -
                        {getFormattedString(
                            improvement.toString(),
                            improvement < 60000,
                        )}
                    </span>
                ) : pb.previousPb === null ? (
                    <span className={styles.listFirstPb}>First PB!</span>
                ) : null}
                <span className={styles.listTimestamp}>
                    <FromNow time={pb.endedAt} />
                </span>
            </div>
        </div>
    );
};
