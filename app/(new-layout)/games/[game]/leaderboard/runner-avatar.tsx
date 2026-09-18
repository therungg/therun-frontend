'use client';

import { useState } from 'react';
import { nameHue } from './avatar-hue';
import styles from './leaderboard.module.scss';

interface Props {
    name: string;
    picture?: string | null;
    size?: 'xs' | 'sm' | 'md';
    /**
     * Anonymized runner (`entry.anonymized`). Renders the mock's dashed
     * placeholder monogram instead of an image or initials, so the runner
     * column keeps its rhythm rather than going ragged on the left edge.
     * Never derives from the name — a real runner may be called "Anonymous
     * runner #3".
     */
    anonymous?: boolean;
}

function initials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`;
    return name.slice(0, 2);
}

export function RunnerAvatar({
    name,
    picture,
    size = 'sm',
    anonymous = false,
}: Props) {
    // Stale Twitch CDN URLs 404; fall back to the monogram instead of a
    // broken-image glyph.
    const [imageFailed, setImageFailed] = useState(false);
    const sizeClass =
        size === 'md'
            ? styles.avatarMd
            : size === 'xs'
              ? styles.avatarXs
              : styles.avatar;

    if (anonymous) {
        return (
            <span aria-hidden className={`${sizeClass} ${styles.avatarAnon}`}>
                ?
            </span>
        );
    }

    if (picture && !imageFailed) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                aria-hidden
                className={`${sizeClass} ${styles.avatarImage}`}
                src={picture}
                alt=""
                loading="lazy"
                onError={() => setImageFailed(true)}
            />
        );
    }

    return (
        <span
            aria-hidden
            className={sizeClass}
            style={{ backgroundColor: `hsl(${nameHue(name)} 32% 42%)` }}
        >
            {initials(name)}
        </span>
    );
}
