'use client';

import type { LevelGroupVisibility } from './category-visibility';
import styles from './level-picker.module.scss';
import railStyles from './masthead.module.scss';

interface Props {
    levels: LevelGroupVisibility[];
    activeCategoryName: string;
    /** Entries per category slug; see GamePageData.categoryBoardCounts. */
    boardCounts?: Record<string, number>;
    /** Same contract as CategoryRail's onSelect: writes `?board=`. */
    onSelect: (name: string) => void;
}

/**
 * The leaderboard's Levels dropdown: every level of the game, by name.
 *
 * It used to list the level *groups* — of which every game has exactly one,
 * called "Levels" — so the dropdown held a single option, and picking it
 * unfolded a button per level underneath. Two clicks and a wall of buttons
 * (650 of them on Tomb of the Mask) to reach something you already know the
 * name of. The levels belong in the dropdown itself.
 */
export function LevelPicker({
    levels,
    activeCategoryName,
    boardCounts,
    onSelect,
}: Props) {
    if (levels.length === 0) return null;

    const onLevel = levels.some((l) =>
        l.boards.some((b) => b.name === activeCategoryName),
    );

    const label = (name: string, display: string) => {
        const entries = boardCounts?.[name];
        return entries ? `${display} (${entries.toLocaleString()})` : display;
    };

    // A game has one level group today, so its name would head a list of
    // everything in the dropdown and say nothing. Group headings appear only
    // if a game ever splits its levels across several.
    const grouped = levels.length > 1;

    return (
        <div className={styles.levelPicker}>
            <select
                className={`${railStyles.categorySelect} ${
                    onLevel ? railStyles.categorySelectActive : ''
                }`}
                aria-label="Level"
                value={onLevel ? activeCategoryName : ''}
                onChange={(e) => {
                    if (e.target.value === '') return;
                    onSelect(e.target.value);
                }}
            >
                {/* Resting state when the board you're on isn't a level. */}
                {!onLevel && (
                    <option value="" disabled>
                        Select a level…
                    </option>
                )}
                {grouped
                    ? levels.map((l) => (
                          <optgroup key={l.id} label={l.name}>
                              {l.boards.map((c) => (
                                  <option key={c.id} value={c.name}>
                                      {label(c.name, c.display)}
                                  </option>
                              ))}
                          </optgroup>
                      ))
                    : levels[0].boards.map((c) => (
                          <option key={c.id} value={c.name}>
                              {label(c.name, c.display)}
                          </option>
                      ))}
            </select>
        </div>
    );
}
