'use client';

import { useState } from 'react';
import styles from './overview.module.scss';

interface Props {
    imageUrl?: string | null;
    display: string;
}

export function CategoryEmblem({ imageUrl, display }: Props) {
    // Stale/rotted emblem URLs 404; fall back to the monogram instead of a
    // broken-image glyph.
    const [imageFailed, setImageFailed] = useState(false);

    if (imageUrl && !imageFailed) {
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

    const letter = [...display][0];

    return (
        <span aria-hidden className={styles.emblemFallback}>
            {letter ?? ''}
        </span>
    );
}
