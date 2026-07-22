'use client';

import { useState } from 'react';
import styles from './overview.module.scss';

interface Props {
    imageUrl?: string | null;
}

// No image (or a rotted URL that 404s) renders nothing at all — monogram
// fallbacks collide on similar names ("1 Star"/"120 Star"/"16 Star" all
// read "1"), which looks broken. Joey's call 2026-07-22.
export function CategoryEmblem({ imageUrl }: Props) {
    const [imageFailed, setImageFailed] = useState(false);

    if (!imageUrl || imageFailed) return null;

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={imageUrl}
            alt=""
            aria-hidden
            width={36}
            height={36}
            className={styles.emblem}
            loading="lazy"
            onError={() => setImageFailed(true)}
        />
    );
}
