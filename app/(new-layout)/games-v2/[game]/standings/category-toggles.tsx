'use client';

import type { StandingsCategory } from '../../../../../types/leaderboards.types';
import styles from './standings.module.scss';

/** One rendered row of the band: group label (null = ungrouped) + members. */
export interface ToggleSection {
    key: string;
    label: string | null;
    /** Indices into the payload's category list. */
    indices: number[];
}

interface Props {
    categories: StandingsCategory[];
    sections: ToggleSection[];
    /** Indices into `categories`. */
    selected: number[];
    onToggle: (index: number) => void;
    /** Turn a whole section's categories on or off in one commit. */
    onSetMany: (indices: number[], on: boolean) => void;
    onAll: () => void;
    onNone: () => void;
}

/**
 * The feature's primary control. Each pill is a category in or out of the
 * scoring, not a row filter — turning one off changes every score. Pills sit
 * in labeled group rows (the plate's rail vocabulary), so a game with thirty
 * categories reads as a few group decisions, not thirty pill decisions; each
 * group carries its own all/none shortcut.
 */
export function CategoryToggles({
    categories,
    sections,
    selected,
    onToggle,
    onSetMany,
    onAll,
    onNone,
}: Props) {
    const isOn = (i: number) => selected.includes(i);
    const allOn = selected.length === categories.length;
    // Single unlabeled section: no group anatomy, just the flat pill row.
    const flat = sections.length === 1 && sections[0].label === null;

    return (
        <div className={styles.toggleBand}>
            <div
                className={styles.toggleSections}
                role="group"
                aria-label="Categories counted"
            >
                {sections.map((section) => {
                    const groupAllOn = section.indices.every(isOn);
                    return (
                        <div
                            key={section.key}
                            className={styles.toggleGroup}
                            role={section.label ? 'group' : undefined}
                            aria-label={section.label ?? undefined}
                        >
                            {!flat && (
                                <span className={styles.toggleGroupLabel}>
                                    {section.label ?? 'Other'}
                                </span>
                            )}
                            <div className={styles.togglePills}>
                                {section.indices.map((i) => (
                                    <button
                                        key={categories[i].id}
                                        type="button"
                                        className={
                                            isOn(i)
                                                ? styles.pillOn
                                                : styles.pill
                                        }
                                        aria-pressed={isOn(i)}
                                        onClick={() => onToggle(i)}
                                    >
                                        {categories[i].display}
                                        <span className={styles.pillCount}>
                                            {categories[i].entryCount}
                                        </span>
                                    </button>
                                ))}
                                {!flat && section.indices.length > 1 && (
                                    <button
                                        type="button"
                                        className={styles.groupAction}
                                        onClick={() =>
                                            onSetMany(
                                                section.indices,
                                                !groupAllOn,
                                            )
                                        }
                                    >
                                        {groupAllOn
                                            ? 'Count none'
                                            : 'Count all'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
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
