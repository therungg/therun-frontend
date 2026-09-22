'use client';

import type { StandingsCategory } from '../../../../../types/leaderboards.types';
import { CategoryIcon } from '../shared/category-icon';
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
    /** Entry count to show per category (indexed like categories); null hides the count. */
    counts: (number | null)[];
    sections: ToggleSection[];
    /** Indices into `categories`. */
    selected: number[];
    onToggle: (index: number) => void;
    /** Turn a whole section's categories on or off in one commit. `key` names
     * the control for the busy state. */
    onSetMany: (indices: number[], on: boolean, key: string) => void;
    onAll: () => void;
    onNone: () => void;
    /** The control whose re-scoring is in flight — `cat:<id>`, `group:<key>`
     * or `bulk` — else null. Every toggle goes quiet with the rest of the
     * page; this one keeps its weight and wears the ring. */
    pendingKey?: string | null;
    /** Category art by category slug; absent for a category without any. */
    icons?: Record<string, string | null>;
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
    counts,
    sections,
    selected,
    onToggle,
    onSetMany,
    onAll,
    onNone,
    icons,
    pendingKey = null,
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
                                {section.indices.map((i) => {
                                    const busy =
                                        pendingKey ===
                                        `cat:${categories[i].id}`;
                                    return (
                                        <button
                                            key={categories[i].id}
                                            type="button"
                                            className={`${isOn(i) ? styles.pillOn : styles.pill} ${busy ? styles.toggleBusy : ''}`}
                                            aria-pressed={isOn(i)}
                                            aria-busy={busy || undefined}
                                            onClick={() => onToggle(i)}
                                        >
                                            <CategoryIcon
                                                imageUrl={
                                                    icons?.[categories[i].name]
                                                }
                                                size={17}
                                            />
                                            {categories[i].display}
                                            {busy ? (
                                                <span
                                                    aria-hidden
                                                    className={
                                                        styles.toggleSpinner
                                                    }
                                                />
                                            ) : (
                                                counts[i] != null && (
                                                    <span
                                                        className={
                                                            styles.pillCount
                                                        }
                                                    >
                                                        {counts[i]}
                                                    </span>
                                                )
                                            )}
                                        </button>
                                    );
                                })}
                                {!flat && section.indices.length > 1 && (
                                    <button
                                        type="button"
                                        className={`${styles.groupAction} ${pendingKey === `group:${section.key}` ? styles.toggleBusy : ''}`}
                                        aria-busy={
                                            pendingKey ===
                                            `group:${section.key}`
                                                ? true
                                                : undefined
                                        }
                                        onClick={() =>
                                            onSetMany(
                                                section.indices,
                                                !groupAllOn,
                                                `group:${section.key}`,
                                            )
                                        }
                                    >
                                        {groupAllOn
                                            ? 'Count none'
                                            : 'Count all'}
                                        {pendingKey ===
                                            `group:${section.key}` && (
                                            <span
                                                aria-hidden
                                                className={styles.toggleSpinner}
                                            />
                                        )}
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
                    className={`${styles.quietAction} ${pendingKey === 'bulk' ? styles.toggleBusy : ''}`}
                    aria-busy={pendingKey === 'bulk' ? true : undefined}
                    onClick={allOn ? onNone : onAll}
                >
                    {allOn ? 'Clear all' : 'Select all'}
                    {pendingKey === 'bulk' && (
                        <span aria-hidden className={styles.toggleSpinner} />
                    )}
                </button>
            </div>
        </div>
    );
}
