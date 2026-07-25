'use client';

import type { StandingsCategory } from '../../../../../types/leaderboards.types';
import styles from './standings.module.scss';

interface Props {
    categories: StandingsCategory[];
    /** Indices into `categories`. */
    selected: number[];
    onToggle: (index: number) => void;
    onAll: () => void;
    onNone: () => void;
}

/**
 * The feature's primary control. Each pill is a category in or out of the
 * scoring, not a row filter — turning one off changes every score, because
 * an unrun category counts as zero. The count of selected categories is the
 * score's divisor, so it's stated in the band rather than left implicit.
 */
export function CategoryToggles({
    categories,
    selected,
    onToggle,
    onAll,
    onNone,
}: Props) {
    const isOn = (i: number) => selected.includes(i);
    const allOn = selected.length === categories.length;

    return (
        <div className={styles.toggleBand}>
            <div
                className={styles.togglePills}
                role="group"
                aria-label="Categories counted"
            >
                {categories.map((category, i) => (
                    <button
                        key={category.id}
                        type="button"
                        className={isOn(i) ? styles.pillOn : styles.pill}
                        aria-pressed={isOn(i)}
                        onClick={() => onToggle(i)}
                    >
                        {category.display}
                        <span className={styles.pillCount}>
                            {category.entryCount}
                        </span>
                    </button>
                ))}
            </div>
            <div className={styles.toggleActions}>
                <span className={styles.divisorNote}>
                    {selected.length} of {categories.length} counted
                </span>
                <button
                    type="button"
                    className={styles.quietAction}
                    onClick={allOn ? onNone : onAll}
                >
                    {allOn ? 'Clear all' : 'Select all'}
                </button>
            </div>
        </div>
    );
}
