'use client';

import { useRef } from 'react';
import { AccentFromCover } from './accent-from-cover';
import styles from './board-ambience.module.scss';

interface Props {
    coverUrl: string | null;
    children: React.ReactNode;
}

/**
 * Page-scope wrapper for a board's per-game identity. Hosts the
 * `--board-accent(-soft)` custom props (sampled from the cover art) so every
 * descendant — plate, category chips, table header — inherits them. No cover
 * (or monochrome art) → no accent; the neutral look is the designed
 * fallback, not an error state.
 */
export function BoardAmbience({ coverUrl, children }: Props) {
    const scopeRef = useRef<HTMLDivElement>(null);
    return (
        <div ref={scopeRef} className={styles.scope}>
            <AccentFromCover coverUrl={coverUrl} targetRef={scopeRef} />
            {children}
        </div>
    );
}
