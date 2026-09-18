'use client';

import { useMemo, useState } from 'react';
import type { MergeCategoryOption } from '../../../../../../types/reassignments.types';
import styles from './reassignments.module.scss';

interface Props {
    categories: MergeCategoryOption[];
    /** Excluded from the list — the board already picked as the source. */
    excludeId?: number;
    onPick: (category: MergeCategoryOption) => void;
}

/**
 * The list every merge starts from: one clickable row per category on the
 * game. It lists boards the rest of the console does not — a board with no
 * runs, a board nobody featured — because those are the ones that need
 * merging away, and the console's usual category list drops them at the
 * activity floor.
 *
 * A board that was already merged is shown rather than hidden, disabled, so
 * the answer to "where did that board go" is on screen instead of being an
 * absence. The backend rejects a tombstoned board at either end anyway.
 */
export function MergeCategoryPicker({ categories, excludeId, onPick }: Props) {
    const [filter, setFilter] = useState('');

    const rows = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return categories
            .filter((c) => c.id !== excludeId)
            .filter((c) => !q || c.display.toLowerCase().includes(q));
    }, [categories, excludeId, filter]);

    const mergedDisplay = (id: number) =>
        categories.find((c) => c.id === id)?.display ?? `#${id}`;

    return (
        <div className={styles.pickerWrap}>
            {categories.length > 8 && (
                <input
                    type="search"
                    className={styles.input}
                    placeholder="Filter categories…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    aria-label="Filter categories"
                />
            )}

            {rows.length === 0 ? (
                <p className={styles.pickerEmpty}>
                    {filter
                        ? 'No category matches that.'
                        : 'This game has no other categories.'}
                </p>
            ) : (
                <ul className={styles.pickerList}>
                    {rows.map((c) => {
                        const merged = c.mergedInto !== null;
                        return (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    className={styles.pickerRow}
                                    disabled={merged}
                                    onClick={() => onPick(c)}
                                >
                                    <span className={styles.pickerName}>
                                        {c.display}
                                    </span>
                                    <span className={styles.pickerTags}>
                                        {merged && (
                                            <span className={styles.pickerTag}>
                                                merged into{' '}
                                                {mergedDisplay(
                                                    c.mergedInto as number,
                                                )}
                                            </span>
                                        )}
                                        {!merged && !c.featured && (
                                            <span className={styles.pickerTag}>
                                                not featured
                                            </span>
                                        )}
                                        {!merged && c.archived && (
                                            <span className={styles.pickerTag}>
                                                archived
                                            </span>
                                        )}
                                        {!merged && c.isExtension && (
                                            <span className={styles.pickerTag}>
                                                extension
                                            </span>
                                        )}
                                    </span>
                                    <span className={styles.pickerRuns}>
                                        {c.runs === 1
                                            ? '1 run'
                                            : `${c.runs} runs`}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
