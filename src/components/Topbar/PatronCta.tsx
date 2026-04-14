'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import Link from '~src/components/link';
import PatreonName from '~src/components/patreon/patreon-name';
import { BunnyIcon } from '~src/icons/bunny-icon';
import type {
    FeaturedPatronsResponse,
    PatronPreferences,
} from '../../../types/patreon.types';
import styles from './PatronCta.module.scss';

interface PatronCtaProps {
    featuredPatrons: FeaturedPatronsResponse;
}

interface Slide {
    key: string;
    label: string;
    patron: {
        patreonName: string;
        username: string | null;
        picture: string | null;
        tier: number;
        preferences: PatronPreferences | null;
    };
}

function PatronDisplayName({
    patron,
    tier,
}: {
    patron: Slide['patron'];
    tier: number;
}) {
    const displayName = patron.username ?? patron.patreonName;
    if (patron.preferences) {
        return (
            <span className={styles.name}>
                <PatreonName
                    name={displayName}
                    preferences={patron.preferences}
                    tier={tier}
                    icon={false}
                />
                {patron.preferences.showIcon && <BunnyIcon size={16} />}
            </span>
        );
    }
    return <span className={styles.name}>{displayName}</span>;
}

export function PatronCta({ featuredPatrons }: PatronCtaProps) {
    const { supporterOfTheDay, latestPatron } = featuredPatrons;
    const [activeIndex, setActiveIndex] = useState(0);
    const [exitingIndex, setExitingIndex] = useState<number | null>(null);
    const [reducedMotion, setReducedMotion] = useState(false);
    const isPaused = useRef(false);

    useEffect(() => {
        setReducedMotion(
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        );
    }, []);

    const slides: Slide[] = [];

    if (latestPatron) {
        slides.push({
            key: 'latest',
            label: 'Latest supporter',
            patron: {
                patreonName: latestPatron.patreonName,
                username: latestPatron.username,
                picture: latestPatron.picture,
                tier: latestPatron.tier,
                preferences: latestPatron.preferences,
            },
        });
    }

    if (supporterOfTheDay) {
        slides.push({
            key: 'sotd',
            label: 'Supporter of the day',
            patron: {
                patreonName: supporterOfTheDay.patreonName,
                username: supporterOfTheDay.username,
                picture: supporterOfTheDay.picture,
                tier: supporterOfTheDay.tier,
                preferences: supporterOfTheDay.preferences,
            },
        });
    }

    useEffect(() => {
        if (slides.length <= 1 || reducedMotion) return;

        const interval = setInterval(() => {
            if (!isPaused.current) {
                setActiveIndex((prev) => {
                    const next = (prev + 1) % slides.length;
                    setExitingIndex(prev);
                    setTimeout(() => setExitingIndex(null), 400);
                    return next;
                });
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [slides.length, reducedMotion]);

    // Fallback: no featured patrons at all
    if (slides.length === 0) {
        return (
            <Link href="/patron" className={styles.container}>
                <span className={styles.icon}>
                    <BunnyIcon size={22} />
                </span>
                <span className={styles.fallbackText}>Support therun.gg</span>
                <span className={styles.ctaButton}>Become a Supporter</span>
            </Link>
        );
    }

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
        >
            {slides[activeIndex]?.patron.picture ? (
                <Image
                    src={slides[activeIndex].patron.picture!}
                    alt=""
                    width={28}
                    height={28}
                    className={styles.avatar}
                    unoptimized
                />
            ) : (
                <span className={styles.icon}>
                    <BunnyIcon size={22} />
                </span>
            )}

            <div className={styles.textArea} aria-live="polite">
                {slides.map((slide, i) => (
                    <div
                        key={slide.key}
                        className={`${styles.slide} ${i === activeIndex ? styles.slideActive : ''} ${i === exitingIndex ? styles.slideExiting : ''}`}
                    >
                        <span className={styles.label}>{slide.label}</span>
                        <PatronDisplayName
                            patron={slide.patron}
                            tier={slide.patron.tier}
                        />
                    </div>
                ))}
            </div>

            <span className={styles.ctaButton}>Become a Supporter</span>
        </Link>
    );
}
