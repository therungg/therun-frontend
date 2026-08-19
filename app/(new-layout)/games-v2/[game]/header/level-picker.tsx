'use client';

import { useEffect, useState } from 'react';
import { levelBoardLabel } from '~src/lib/levels/display';
import type { LevelTemplate } from '../../../../../types/levels.types';
import type { LevelGroupVisibility } from './category-visibility';
import styles from './level-picker.module.scss';
import railStyles from './masthead.module.scss';

interface Props {
    levels: LevelGroupVisibility[];
    /** The level group id owning the currently active category, or null
     *  when the active board isn't a level board. */
    activeLevelId: number | null;
    activeCategoryName: string;
    templates: LevelTemplate[];
    /** Board population per category slug; see GamePageData.categoryBoardCounts. */
    boardCounts?: Record<string, number>;
    /** Same contract as CategoryRail's onSelect: writes `?category=`. */
    onSelect: (name: string) => void;
}

/**
 * The leaderboard's Levels dropdown: a native `<select>` of levels, then
 * pills for the chosen level's boards, each labelled by its template's own
 * display ("Any%") rather than the board's full "<Level> — <Template>"
 * display (see docs/frontend-guide-levels.md).
 */
export function LevelPicker({
    levels,
    activeLevelId,
    activeCategoryName,
    templates,
    boardCounts,
    onSelect,
}: Props) {
    // Remembers the reader's own choice: picking a level with no board
    // selected yet must not snap back to whatever level the active board
    // happens to be in. Only an externally-driven move onto a real level
    // board (nav, sticky bar, back button) pulls the dropdown along.
    const [chosenId, setChosenId] = useState<number | null>(
        activeLevelId ?? levels[0]?.id ?? null,
    );

    useEffect(() => {
        if (activeLevelId != null) setChosenId(activeLevelId);
    }, [activeLevelId]);

    if (levels.length === 0) return null;

    const chosen = levels.find((l) => l.id === chosenId) ?? levels[0];

    return (
        <div className={styles.levelPicker}>
            <select
                className={railStyles.categorySelect}
                aria-label="Level"
                value={chosen.id}
                onChange={(e) => {
                    const id = Number(e.target.value);
                    setChosenId(id);
                    const level = levels.find((l) => l.id === id);
                    const first = level?.boards[0];
                    if (first) onSelect(first.name);
                }}
            >
                {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                        {l.name}
                    </option>
                ))}
            </select>
            <div className={railStyles.chips}>
                {chosen.boards.map((c) => {
                    const active = c.name === activeCategoryName;
                    const runners = boardCounts?.[c.name] ?? null;
                    const label = levelBoardLabel(c, templates);
                    return (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => onSelect(c.name)}
                            aria-pressed={active}
                            aria-label={
                                runners == null
                                    ? undefined
                                    : `${label}, ${runners} runners`
                            }
                            title={
                                runners == null
                                    ? undefined
                                    : `${runners.toLocaleString()} runners`
                            }
                            className={`${railStyles.chip} ${railStyles.chipCategory} ${
                                active ? railStyles.chipActive : ''
                            }`}
                        >
                            {label}
                            {runners != null && (
                                <span
                                    aria-hidden
                                    className={railStyles.chipCount}
                                >
                                    {runners.toLocaleString()}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
