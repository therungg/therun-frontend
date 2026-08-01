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
 * descendant — plate, category chips, table header — inherits them, and
 * paints the cover itself as a blurred full-bleed banner behind the top of
 * the page. No cover → no banner, no accent; the neutral look is the
 * designed fallback, not an error state.
 */
export function BoardAmbience({ coverUrl, children }: Props) {
    const scopeRef = useRef<HTMLDivElement>(null);
    return (
        <div ref={scopeRef} className={styles.scope}>
            {coverUrl && (
                <div className={styles.backdrop} aria-hidden>
                    <img src={coverUrl} alt="" loading="eager" />
                </div>
            )}
            <AccentFromCover coverUrl={coverUrl} targetRef={scopeRef} />
            {children}
        </div>
    );
}
