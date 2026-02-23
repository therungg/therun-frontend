'use client';

import Image from 'next/image';
import { useRef } from 'react';
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

interface PbFeedClientProps {
    notablePbs: FinishedRunPB[];
    allPbs: FinishedRunPB[];
    gameImages: Record<string, string>;
}

export const PbFeedClient = ({
    notablePbs,
    allPbs,
    gameImages,
}: PbFeedClientProps) => {
    return (
        <Panel title="Personal Bests" subtitle="Recent PBs" className="p-0">
            {notablePbs.length > 0 && (
                <FeaturedCarousel pbs={notablePbs} gameImages={gameImages} />
            )}
            {allPbs.length > 0 && (
                <div className={styles.listContainer}>
                    {allPbs.map((pb) => (
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
    const scrollRef = useRef<HTMLDivElement>(null);
    const dragState = useRef({ dragging: false, startX: 0, scrollLeft: 0 });

    const onPointerDown = (e: React.PointerEvent) => {
        const el = scrollRef.current;
        if (!el) return;
        dragState.current = {
            dragging: true,
            startX: e.clientX,
            scrollLeft: el.scrollLeft,
        };
        el.setPointerCapture(e.pointerId);
        el.style.scrollBehavior = 'auto';
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragState.current.dragging) return;
        const el = scrollRef.current;
        if (!el) return;
        const dx = e.clientX - dragState.current.startX;
        el.scrollLeft = dragState.current.scrollLeft - dx;
    };

    const onPointerUp = (e: React.PointerEvent) => {
        dragState.current.dragging = false;
        const el = scrollRef.current;
        if (!el) return;
        el.releasePointerCapture(e.pointerId);
        el.style.scrollBehavior = 'smooth';
    };

    return (
        <div
            ref={scrollRef}
            className={styles.featured}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
        >
            {pbs.map((pb) => {
                const imageUrl = gameImages[pb.game] ?? FALLBACK_IMAGE;
                const improvement =
                    pb.previousPb !== null ? pb.previousPb - pb.time : null;
                const hasImprovement = improvement !== null && improvement > 0;

                return (
                    <div key={pb.id} className={styles.featuredSlide}>
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
