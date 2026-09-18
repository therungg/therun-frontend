'use client';

import { useState } from 'react';
import styles from './sidebar.module.scss';

interface Props {
    about: string | null;
    /** Release year · developer · platform, when pageData carries them. */
    facts?: {
        releaseYear: number | null;
        developer: string | null;
        platforms: string[];
    };
    /** Flat = secondary rail panel (see .panelFlat). */
    flat?: boolean;
}

/**
 * The game's description, at the bottom of the rail.
 *
 * It used to clamp at six lines and end mid-sentence with no way to read the
 * rest — a paragraph of IGDB prose taking the most vertical space in the
 * sidebar to say the least. Three lines with a reveal, over a facts line that
 * carries what people actually scan for (when, who, where).
 */
export function AboutPanel({ about, facts, flat = false }: Props) {
    const [expanded, setExpanded] = useState(false);
    const text = about?.trim() ?? '';
    const factLine = facts ? buildFactLine(facts) : null;
    if (!text && !factLine) return null;

    return (
        <section className={flat ? styles.panelFlat : styles.panel}>
            <div className={styles.panelHead}>
                <span className={styles.eyebrow}>About</span>
            </div>
            {factLine && <p className={styles.aboutFacts}>{factLine}</p>}
            {text && (
                <>
                    <p
                        className={`text-muted small mb-0 ${styles.aboutText} ${
                            expanded ? '' : styles.aboutClamped
                        }`}
                    >
                        {text}
                    </p>
                    {/* The reveal is offered on length alone — the clamp is a
                        CSS line count, which JS can't cheaply measure here.
                        Short descriptions never reach it. */}
                    {text.length > 180 && (
                        <button
                            type="button"
                            className={styles.quietLink}
                            onClick={() => setExpanded((v) => !v)}
                        >
                            {expanded ? 'Less' : 'More'}
                        </button>
                    )}
                </>
            )}
        </section>
    );
}

function buildFactLine({
    releaseYear,
    developer,
    platforms,
}: NonNullable<Props['facts']>): string | null {
    const parts = [
        releaseYear ? String(releaseYear) : null,
        developer,
        // One platform, not the full IGDB list — the rail is 320px wide and
        // "PlayStation, PC, Nintendo Switch, Xbox…" wraps to three lines.
        platforms.length > 0 ? platforms[0] : null,
    ].filter((p): p is string => !!p);
    return parts.length > 0 ? parts.join(' · ') : null;
}
