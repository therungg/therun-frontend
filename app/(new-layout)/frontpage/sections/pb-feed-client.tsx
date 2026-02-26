'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaBolt, FaStar } from 'react-icons/fa6';
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
    userPictures: Record<string, string>;
}

export const PbFeedClient = ({
    notablePbs,
    allPbs,
    gameImages,
    userPictures,
}: PbFeedClientProps) => {
    return (
        <Panel
            panelId="pbs"
            title="Personal Bests"
            subtitle="Recent PBs"
            className="p-0"
        >
            {notablePbs.length > 0 && (
                <FeaturedCarousel
                    pbs={notablePbs}
                    gameImages={gameImages}
                    userPictures={userPictures}
                />
            )}
            {allPbs.length > 0 && (
                <div className={styles.listContainer}>
                    {allPbs.map((pb) => (
                        <CompactItem
                            key={pb.id}
                            pb={pb}
                            avatarUrl={userPictures[pb.username]}
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
    userPictures,
}: {
    pbs: FinishedRunPB[];
    gameImages: Record<string, string>;
    userPictures: Record<string, string>;
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
        // Snap to 0 with no transition
        bar.style.transition = 'none';
        bar.style.width = '0%';
        // Wait for the browser to paint the 0% state, then animate to 100%
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                bar.style.transition = `width ${ROTATE_INTERVAL}ms linear`;
                bar.style.width = '100%';
            });
        });
    }, []);

    // Auto-rotate (respects prefers-reduced-motion)
    useEffect(() => {
        if (pbs.length <= 1) return;

        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        if (prefersReducedMotion) return;

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
            // Freeze the bar at its current computed width
            const width = bar.getBoundingClientRect().width;
            const parentWidth =
                bar.parentElement?.getBoundingClientRect().width || 1;
            const pct = (width / parentWidth) * 100;
            bar.style.transition = 'none';
            bar.style.width = `${pct}%`;
        }
    };

    const resume = () => {
        pausedRef.current = false;
        const bar = progressRef.current;
        if (bar) {
            const currentPct = parseFloat(bar.style.width) || 0;
            const remainingTime = ((100 - currentPct) / 100) * ROTATE_INTERVAL;
            // Force reflow so the browser sees the current frozen width
            void bar.offsetWidth;
            bar.style.transition = `width ${remainingTime}ms linear`;
            bar.style.width = '100%';
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

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = activeIndex > 0 ? activeIndex - 1 : pbs.length - 1;
            onDotClick(prev);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = activeIndex < pbs.length - 1 ? activeIndex + 1 : 0;
            onDotClick(next);
        }
    };

    return (
        <div
            className={styles.carouselWrapper}
            onMouseEnter={pause}
            onMouseLeave={resume}
            onFocus={pause}
            onBlur={resume}
            role="region"
            aria-roledescription="carousel"
            aria-label="Highlighted personal bests"
            onKeyDown={onKeyDown}
        >
            <div
                ref={scrollRef}
                className={styles.featured}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                aria-live="polite"
            >
                {pbs.map((pb, i) => {
                    const imageUrl = gameImages[pb.game] ?? FALLBACK_IMAGE;
                    const avatarUrl = userPictures[pb.username];
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
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`Slide ${i + 1} of ${pbs.length}: ${pb.username} - ${pb.game} ${pb.category}`}
                        >
                            <img
                                src={imageUrl}
                                alt=""
                                className={styles.featuredBg}
                            />
                            <div className={styles.featuredOverlay} />
                            <div className={styles.featuredContent}>
                                <div className={styles.featuredBadges}>
                                    <span className={styles.featuredBadge}>
                                        <FaBolt size={9} aria-hidden="true" />
                                        Highlighted PB
                                    </span>
                                    <span className={styles.featuredTimestamp}>
                                        <FromNow time={pb.endedAt} />
                                    </span>
                                </div>
                                <div className={styles.featuredTop}>
                                    {avatarUrl && (
                                        <Image
                                            src={avatarUrl}
                                            alt=""
                                            width={52}
                                            height={52}
                                            className={styles.featuredAvatar}
                                            unoptimized
                                        />
                                    )}
                                    <div className={styles.featuredIdentity}>
                                        <span
                                            className={
                                                styles.featuredRunnerName
                                            }
                                        >
                                            <UserLink username={pb.username} />
                                        </span>
                                        <span
                                            className={
                                                styles.featuredGameCategory
                                            }
                                        >
                                            {pb.game} &middot; {pb.category}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.featuredBottom}>
                                    <span className={styles.featuredTime}>
                                        <DurationToFormatted
                                            duration={pb.time}
                                        />
                                    </span>
                                    {hasImprovement ? (
                                        <span className={styles.featuredDelta}>
                                            &minus;
                                            {getFormattedString(
                                                improvement.toString(),
                                                improvement < 60000,
                                            )}
                                        </span>
                                    ) : pb.previousPb === null ? (
                                        <span
                                            className={styles.featuredFirstPb}
                                        >
                                            <FaStar
                                                size={11}
                                                aria-hidden="true"
                                            />
                                            First PB!
                                        </span>
                                    ) : null}
                                </div>
                                <div className={styles.featuredStats}>
                                    <div className={styles.featuredStat}>
                                        <span
                                            className={styles.featuredStatValue}
                                        >
                                            {pb.attemptCount.toLocaleString()}
                                        </span>
                                        <span
                                            className={styles.featuredStatLabel}
                                        >
                                            Attempts
                                        </span>
                                    </div>
                                    <div className={styles.featuredStat}>
                                        <span
                                            className={styles.featuredStatValue}
                                        >
                                            {pb.finishedAttemptCount.toLocaleString()}
                                        </span>
                                        <span
                                            className={styles.featuredStatLabel}
                                        >
                                            Finished
                                        </span>
                                    </div>
                                    <div className={styles.featuredStat}>
                                        <span
                                            className={styles.featuredStatValue}
                                        >
                                            {Math.round(
                                                pb.totalRunTime / 3600000,
                                            ).toLocaleString()}
                                            h
                                        </span>
                                        <span
                                            className={styles.featuredStatLabel}
                                        >
                                            Played
                                        </span>
                                    </div>
                                </div>
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
    avatarUrl,
}: {
    pb: FinishedRunPB;
    avatarUrl?: string;
}) => {
    const improvement = pb.previousPb !== null ? pb.previousPb - pb.time : null;
    const hasImprovement = improvement !== null && improvement > 0;

    return (
        <Link href={`/${pb.username}`} className={styles.listItem}>
            {avatarUrl && (
                <Image
                    src={avatarUrl}
                    alt=""
                    width={40}
                    height={40}
                    className={styles.listAvatar}
                    unoptimized
                />
            )}
            <div className={styles.listInfo}>
                <span className={styles.listRunnerName}>{pb.username}</span>
                <span className={styles.listGameCategory}>
                    {pb.game} &middot; {pb.category}
                </span>
            </div>
            <div className={styles.listRight}>
                <span className={styles.listTimeRow}>
                    <span className={styles.listTime}>
                        <DurationToFormatted duration={pb.time} />
                    </span>
                    {hasImprovement ? (
                        <span className={styles.listDelta}>
                            &minus;
                            {getFormattedString(
                                improvement.toString(),
                                improvement < 60000,
                            )}
                        </span>
                    ) : pb.previousPb === null ? (
                        <span className={styles.listFirstPb}>
                            <FaStar size={9} aria-hidden="true" /> First PB!
                        </span>
                    ) : null}
                </span>
                <span className={styles.listTimestamp}>
                    <FromNow time={pb.endedAt} />
                </span>
            </div>
        </Link>
    );
};
