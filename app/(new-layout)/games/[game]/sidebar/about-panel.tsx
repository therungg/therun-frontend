'use client';

import { useState } from 'react';
import styles from './sidebar.module.scss';

interface Props {
    about: string | null;
    /** Flat = secondary rail panel (see .panelFlat). */
    flat?: boolean;
}

/**
 * The game's description, at the bottom of the rail.
 *
 * It used to clamp at six lines and end mid-sentence with no way to read the
 * rest — a paragraph of IGDB prose taking the most vertical space in the
 * sidebar to say the least. Three lines with a reveal instead.
 *
 * Deliberately carries no release year / developer / platform line: the
 * masthead prints exactly that, on both the overview and the board view, a
 * few hundred pixels away.
 */
export function AboutPanel({ about, flat = false }: Props) {
    const [expanded, setExpanded] = useState(false);
    const text = about?.trim() ?? '';
    if (!text) return null;

    return (
        <section className={flat ? styles.panelFlat : styles.panel}>
            <div className={styles.panelHead}>
                <span className={styles.eyebrow}>About</span>
            </div>
            <p
                className={`text-muted small mb-0 ${styles.aboutText} ${
                    expanded ? '' : styles.aboutClamped
                }`}
            >
                {text}
            </p>
            {/* The reveal is offered on length alone — the clamp is a CSS
                line count, which JS can't cheaply measure here. Short
                descriptions never reach it. */}
            {text.length > 180 && (
                <button
                    type="button"
                    className={styles.quietLink}
                    onClick={() => setExpanded((v) => !v)}
                >
                    {expanded ? 'Less' : 'More'}
                </button>
            )}
        </section>
    );
}
