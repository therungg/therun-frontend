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
 * The leaderboard's Levels dropdown: a native `<select>` of levels. A level
 * with more than one board also gets pills to pick between them, each
 * labelled by its template's own display ("Any%") rather than the board's
 * full "<Level> — <Template>" display (see docs/frontend-guide-levels.md); a
 * single-board level shows no pill — the dropdown selection is the choice.
 */
export function LevelPicker({
    levels,
    activeLevelId,
    activeCategoryName,
    templates,
    boardCounts,
    onSelect,
}: Props) {
    // The dropdown tracks the active board's level in BOTH directions —
    // including back to a placeholder when the active board isn't a level
    // board — plus one optimistic hop on pick before the RSC payload catches
    // up. Tracking to null is what fixes re-selection: once you've left a
    // level, the select no longer holds it as its value, so picking it again
    // is a real change the native <select> fires on. (An always-retained
    // value made the previously-selected level un-re-selectable.)
    const [chosenId, setChosenId] = useState<number | null>(activeLevelId);

    useEffect(() => {
        setChosenId(activeLevelId);
    }, [activeLevelId]);

    if (levels.length === 0) return null;

    const chosen =
        chosenId != null
            ? (levels.find((l) => l.id === chosenId) ?? null)
            : null;

    // Green only when the shown level is the active board — never on the
    // placeholder, and never on a level merely parked in the select.
    const levelIsActive = chosen != null && chosen.id === activeLevelId;

    return (
        <div className={styles.levelPicker}>
            <select
                className={`${railStyles.categorySelect} ${
                    levelIsActive ? railStyles.categorySelectActive : ''
                }`}
                aria-label="Level"
                value={chosen ? chosen.id : ''}
                onChange={(e) => {
                    if (e.target.value === '') return;
                    const id = Number(e.target.value);
                    setChosenId(id);
                    const level = levels.find((l) => l.id === id);
                    const first = level?.boards[0];
                    if (first) onSelect(first.name);
                }}
            >
                {/* Resting state when the active board isn't a level board:
                    the select holds no level, so every level below is a
                    re-selectable change. */}
                {chosen == null && (
                    <option value="" disabled>
                        Select a level…
                    </option>
                )}
                {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                        {l.name}
                    </option>
                ))}
            </select>
            {/* Pills only for a level offering a real choice of boards. A
                single-category level needs none (the dropdown pick already
                navigates to its one board); no level shown (placeholder) has
                none to offer. */}
            {chosen != null && chosen.boards.length > 1 && (
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
            )}
        </div>
    );
}
