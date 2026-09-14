'use client';

import type { ReactNode } from 'react';
import { useShowcase } from '../../../leaderboards/[name]/showcase-provider';
import styles from './leaderboards.module.scss';

/** "Showcase", what it is showing, and the owner's Customize button. */
export function ShowcaseHeading({ children }: { children: ReactNode }) {
    const { draft, editing } = useShowcase();
    const auto = draft.pins.length === 0;
    const note = !editing
        ? auto
            ? 'Best placements, weighted by board size'
            : null
        : auto
          ? 'Automatic picks. Pin these, or pin any run from the list below.'
          : 'Up to 6 runs. Drag cards to reorder.';
    return (
        <div className={styles.blockHead}>
            <div className={styles.blockHeadText}>
                <h2 className={styles.blockTitle}>Showcase</h2>
                {note ? <span className={styles.blockNote}>{note}</span> : null}
            </div>
            {children}
        </div>
    );
}
