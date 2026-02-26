'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    FaChartLine,
    FaFire,
    FaFlagCheckered,
    FaHeartPulse,
    FaPlay,
    FaTrophy,
} from 'react-icons/fa6';
import styles from './section-nav.module.scss';

const SECTIONS = [
    { id: 'live', label: 'Live', icon: FaPlay },
    { id: 'trending', label: 'Trending', icon: FaFire },
    { id: 'pbs', label: 'PBs', icon: FaTrophy },
    { id: 'races', label: 'Races', icon: FaFlagCheckered },
    { id: 'pulse', label: 'Pulse', icon: FaHeartPulse },
    { id: 'your-stats', label: 'Your Stats', icon: FaChartLine },
] as const;

export const SectionNav = () => {
    const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
    const [isStuck, setIsStuck] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLElement>(null);
    // When a click sets the active item, suppress scroll-spy briefly
    const clickLockRef = useRef<string | null>(null);
    const clickLockTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Detect when nav becomes sticky via a sentinel element
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const obs = new IntersectionObserver(
            ([entry]) => {
                setIsStuck(!entry.isIntersecting);
            },
            { threshold: 0 },
        );
        obs.observe(sentinel);
        return () => obs.disconnect();
    }, []);

    // Scroll-spy: pick the section whose top is closest above the threshold
    // For same-row panels (within 100px), the first in SECTIONS wins
    // Respects click lock — if user clicked a nav item, keep it active
    useEffect(() => {
        const onScroll = () => {
            if (clickLockRef.current) return;

            const threshold = window.innerHeight * 0.35;
            let best: string = SECTIONS[0].id;
            let bestTop = -Infinity;

            for (const s of SECTIONS) {
                const el = document.getElementById(s.id);
                if (!el) continue;
                const top = el.getBoundingClientRect().top;
                if (top > threshold) continue;
                if (top > bestTop + 100) {
                    best = s.id;
                    bestTop = top;
                }
            }

            setActiveId(best);
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollTo = useCallback((id: string) => {
        const el = document.getElementById(id);
        if (!el) return;

        // Lock scroll-spy to this id until scroll settles
        clickLockRef.current = id;
        setActiveId(id);
        clearTimeout(clickLockTimer.current);
        clickLockTimer.current = setTimeout(() => {
            clickLockRef.current = null;
        }, 1000);

        const navHeight = navRef.current?.offsetHeight ?? 40;
        const tabOffset = id === 'live' ? 0 : 64;
        const top =
            el.getBoundingClientRect().top +
            window.scrollY -
            navHeight -
            tabOffset -
            16;
        window.scrollTo({ top, behavior: 'smooth' });
    }, []);

    return (
        <>
            <div ref={sentinelRef} className={styles.sentinel} />
            <nav
                ref={navRef}
                className={`${styles.nav} ${isStuck ? styles.navStuck : ''}`}
                aria-label="Page sections"
            >
                {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    return (
                        <button
                            key={section.id}
                            type="button"
                            className={`${styles.item} ${activeId === section.id ? styles.itemActive : ''}`}
                            onClick={() => scrollTo(section.id)}
                            aria-current={
                                activeId === section.id ? 'true' : undefined
                            }
                        >
                            <Icon size={10} aria-hidden="true" />
                            {section.label}
                        </button>
                    );
                })}
            </nav>
        </>
    );
};
