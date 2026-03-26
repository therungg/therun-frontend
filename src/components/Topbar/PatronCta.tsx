'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '~src/components/link';
import PatreonName from '~src/components/patreon/patreon-name';
import { BunnyIcon } from '~src/icons/bunny-icon';
import type { FeaturedPatronsResponse } from '../../../types/patreon.types';
import styles from './PatronCta.module.scss';

interface PatronCtaProps {
    featuredPatrons: FeaturedPatronsResponse;
}

interface Slide {
    key: string;
    content: React.ReactNode;
}

function PatronDisplayName({
    patron,
}: {
    patron: {
        patreonName: string;
        username: string | null;
        preferences: { colorPreference: number; showIcon: boolean } | null;
    };
}) {
    const displayName = patron.username ?? patron.patreonName;

    if (patron.preferences) {
        return (
            <>
                <PatreonName
                    name={displayName}
                    color={patron.preferences.colorPreference}
                    icon={false}
                />
                {patron.preferences.showIcon && <BunnyIcon size={20} />}
            </>
        );
    }

    return <span>{displayName}</span>;
}

export function PatronCta({ featuredPatrons }: PatronCtaProps) {
    const { supporterOfTheDay, latestPatron } = featuredPatrons;
    const [activeIndex, setActiveIndex] = useState(0);
    const [reducedMotion, setReducedMotion] = useState(false);
    const isPaused = useRef(false);

    useEffect(() => {
        setReducedMotion(
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        );
    }, []);

    const slides: Slide[] = [];

    if (supporterOfTheDay) {
        slides.push({
            key: 'sotd',
            content: (
                <span className={styles.label}>
                    Supporter of the Day:{' '}
                    <PatronDisplayName patron={supporterOfTheDay} />
                </span>
            ),
        });
    }

    if (latestPatron) {
        slides.push({
            key: 'latest',
            content: (
                <span className={styles.label}>
                    Welcome <PatronDisplayName patron={latestPatron} />!
                </span>
            ),
        });
    }

    slides.push({
        key: 'cta',
        content: (
            <>
                Support us <BunnyIcon size={20} />
            </>
        ),
    });

    useEffect(() => {
        if (slides.length <= 1 || reducedMotion) return;

        const interval = setInterval(() => {
            if (!isPaused.current) {
                setActiveIndex((prev) => (prev + 1) % slides.length);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [slides.length, reducedMotion]);

    const visibleSlides = reducedMotion ? [slides[slides.length - 1]] : slides;
    const visibleIndex = reducedMotion ? 0 : activeIndex;

    return (
        <Link
            href="/patron"
            className={styles.container}
            onMouseEnter={() => {
                isPaused.current = true;
            }}
            onMouseLeave={() => {
                isPaused.current = false;
            }}
            aria-live="polite"
        >
            {visibleSlides.map((slide, i) => (
                <span
                    key={slide.key}
                    className={`${styles.slide} ${i === visibleIndex ? styles.slideActive : ''}`}
                >
                    {slide.content}
                </span>
            ))}
        </Link>
    );
}
