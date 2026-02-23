'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
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
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
    const dragState = useRef({
        dragging: false,
        startX: 0,
        scrollLeft: 0,
        moved: false,
    });
    const pausedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
    const progressRef = useRef<HTMLDivElement>(null);

    const [activeIndex, setActiveIndex] = useState(0);

    // Track which slide is visible via IntersectionObserver
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const idx = slideRefs.current.indexOf(
                            entry.target as HTMLDivElement,
                        );
                        if (idx !== -1) setActiveIndex(idx);
                    }
                }
            },
            { root: el, threshold: 0.6 },
        );

        for (const slide of slideRefs.current) {
            if (slide) observer.observe(slide);
        }

        return () => observer.disconnect();
    }, [pbs.length]);

    // Scroll to a specific slide
    const scrollToSlide = useCallback((index: number) => {
        const el = scrollRef.current;
        const slide = slideRefs.current[index];
        if (!el || !slide) return;
        el.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
    }, []);

    // Reset progress bar animation
    const resetProgress = useCallback(() => {
        const bar = progressRef.current;
        if (!bar) return;
        bar.classList.remove(styles.progressBarAnimating);
        bar.classList.remove(styles.progressBarPaused);
        // Force reflow to restart animation
        void bar.offsetWidth;
        bar.style.transitionDuration = `${ROTATE_INTERVAL}ms`;
        bar.classList.add(styles.progressBarAnimating);
    }, []);

    // Auto-rotate
    useEffect(() => {
        if (pbs.length <= 1) return;

        resetProgress();

        timerRef.current = setInterval(() => {
            if (!pausedRef.current) {
                const el = scrollRef.current;
                if (!el) return;
                const nextIndex =
                    Math.round(el.scrollLeft / el.clientWidth) + 1;
                const wrappedIndex = nextIndex >= pbs.length ? 0 : nextIndex;
                scrollToSlide(wrappedIndex);
                resetProgress();
            }
        }, ROTATE_INTERVAL);

        return () => clearInterval(timerRef.current);
    }, [pbs.length, scrollToSlide, resetProgress]);

    const pause = () => {
        pausedRef.current = true;
        const bar = progressRef.current;
        if (bar) {
            const width = bar.getBoundingClientRect().width;
            const parentWidth =
                bar.parentElement?.getBoundingClientRect().width || 1;
            bar.classList.remove(styles.progressBarAnimating);
            bar.classList.add(styles.progressBarPaused);
            bar.style.width = `${(width / parentWidth) * 100}%`;
        }
    };

    const resume = () => {
        pausedRef.current = false;
        const bar = progressRef.current;
        if (bar) {
            const currentPct = parseFloat(bar.style.width) || 0;
            const remainingPct = 100 - currentPct;
            const remainingTime = (remainingPct / 100) * ROTATE_INTERVAL;
            bar.classList.remove(styles.progressBarPaused);
            bar.style.transitionDuration = `${remainingTime}ms`;
            // Force reflow
            void bar.offsetWidth;
            bar.classList.add(styles.progressBarAnimating);
        }
    };

    // Drag-to-scroll handlers
    const onPointerDown = (e: React.PointerEvent) => {
        const el = scrollRef.current;
        if (!el) return;
        dragState.current = {
            dragging: true,
            startX: e.clientX,
            scrollLeft: el.scrollLeft,
            moved: false,
        };
        el.setPointerCapture(e.pointerId);
        el.style.scrollBehavior = 'auto';
        el.style.scrollSnapType = 'none';
        pause();
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragState.current.dragging) return;
        const el = scrollRef.current;
        if (!el) return;
        const dx = e.clientX - dragState.current.startX;
        if (Math.abs(dx) > 3) dragState.current.moved = true;
        el.scrollLeft = dragState.current.scrollLeft - dx;
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (!dragState.current.dragging) return;
        dragState.current.dragging = false;
        const el = scrollRef.current;
        if (!el) return;
        el.releasePointerCapture(e.pointerId);
        el.style.scrollBehavior = 'smooth';
        el.style.scrollSnapType = 'x mandatory';
        // After snap settles, restart timer
        setTimeout(() => {
            resetProgress();
            resume();
            pausedRef.current = false;
        }, 350);
    };

    const onDotClick = (index: number) => {
        scrollToSlide(index);
        // Restart timer from scratch
        clearInterval(timerRef.current);
        resetProgress();
        pausedRef.current = false;
        timerRef.current = setInterval(() => {
            if (!pausedRef.current) {
                const el = scrollRef.current;
                if (!el) return;
                const nextIdx = Math.round(el.scrollLeft / el.clientWidth) + 1;
                const wrapped = nextIdx >= pbs.length ? 0 : nextIdx;
                scrollToSlide(wrapped);
                resetProgress();
            }
        }, ROTATE_INTERVAL);
    };

    return (
        <div
            className={styles.carouselWrapper}
            onMouseEnter={pause}
            onMouseLeave={resume}
        >
            <div
                ref={scrollRef}
                className={styles.featured}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                {pbs.map((pb, i) => {
                    const imageUrl = gameImages[pb.game] ?? FALLBACK_IMAGE;
                    const improvement =
                        pb.previousPb !== null ? pb.previousPb - pb.time : null;
                    const hasImprovement =
                        improvement !== null && improvement > 0;

                    return (
                        <div
                            key={pb.id}
                            ref={(el) => {
                                slideRefs.current[i] = el;
                            }}
                            className={styles.featuredSlide}
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
                                        <DurationToFormatted
                                            duration={pb.time}
                                        />
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
                                        <span
                                            className={styles.featuredFirstPb}
                                        >
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
            {pbs.length > 1 && (
                <>
                    <div className={styles.progressTrack}>
                        <div ref={progressRef} className={styles.progressBar} />
                    </div>
                    <div className={styles.dots}>
                        {pbs.map((_, i) => (
                            <button
                                key={pbs[i].id}
                                type="button"
                                className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
                                onClick={() => onDotClick(i)}
                                aria-label={`Show PB ${i + 1}`}
                            />
                        ))}
                    </div>
                </>
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
