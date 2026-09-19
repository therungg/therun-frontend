'use client';

import { useState } from 'react';
import styles from './category-icon.module.scss';

interface Props {
    imageUrl?: string | null;
    /** Matches the type it sits beside: a chip, a title, a card. */
    size?: number;
    className?: string;
}

/**
 * A category's own art, wherever its name is shown.
 *
 * No image — or a rotted URL that 404s — renders nothing at all. Monogram
 * fallbacks collide on similar names ("1 Star" / "120 Star" / "16 Star" all
 * read "1"), which looks broken (Joey's call, 2026-07-22).
 *
 * Deliberately per category rather than per row: art is set one category at a
 * time, so every game that has any has a partial set, and holding the art back
 * until a whole group is covered meant nobody ever saw it.
 */
export function CategoryIcon({ imageUrl, size = 20, className }: Props) {
    const [failed, setFailed] = useState(false);

    if (!imageUrl || failed) return null;

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={imageUrl}
            alt=""
            aria-hidden
            width={size}
            height={size}
            style={{ width: size, height: size }}
            className={`${styles.icon} ${className ?? ''}`}
            loading="lazy"
            onError={() => setFailed(true)}
        />
    );
}
