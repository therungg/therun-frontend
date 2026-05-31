'use client';

import { useState } from 'react';
import { CategoryWizard } from './category-wizard';
import { GameWizard } from './game-wizard';
import styles from './reassignments.module.scss';

interface CategoryOption {
    id: number;
    display: string;
}

interface Props {
    gameId: number;
    gameSlug: string;
    gameDisplay: string;
    categories: CategoryOption[];
    /** The category currently selected in the console rail, if any. */
    selectedCategory: CategoryOption | null;
}

type Mode = 'game' | 'category';

/**
 * Reassign pane: a mode toggle between merging the whole game into another
 * (game wizard) and merging one category into another within this game
 * (category wizard). The mode is chosen explicitly here rather than inferred
 * from the rail selection — the rail always has a category selected, which
 * would otherwise make the game wizard unreachable.
 */
export function ReassignPane({
    gameId,
    gameSlug,
    gameDisplay,
    categories,
    selectedCategory,
}: Props) {
    const [mode, setMode] = useState<Mode>('game');

    // Category mode needs a source. Prefer the rail selection; otherwise let
    // the mod pick one here so the pane works regardless of rail state.
    const [sourceCategoryId, setSourceCategoryId] = useState<number | null>(
        selectedCategory?.id ?? null,
    );
    const sourceCategory =
        categories.find((c) => c.id === sourceCategoryId) ?? null;

    return (
        <div className={styles.wizard}>
            <div className={styles.modeToggle}>
                <button
                    type="button"
                    className={
                        mode === 'game' ? styles.modeActive : styles.modeButton
                    }
                    onClick={() => setMode('game')}
                >
                    Reassign game
                </button>
                <button
                    type="button"
                    className={
                        mode === 'category'
                            ? styles.modeActive
                            : styles.modeButton
                    }
                    onClick={() => setMode('category')}
                >
                    Reassign a category
                </button>
            </div>

            {mode === 'game' ? (
                <GameWizard
                    sourceGameId={gameId}
                    sourceGameDisplay={gameDisplay}
                    sourceCategoryNames={Object.fromEntries(
                        categories.map((c) => [c.id, c.display]),
                    )}
                />
            ) : (
                <div>
                    <div className={styles.step}>
                        <label htmlFor="source-cat">Source category</label>
                        <select
                            id="source-cat"
                            value={sourceCategoryId ?? ''}
                            onChange={(e) =>
                                setSourceCategoryId(
                                    e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                )
                            }
                        >
                            <option value="">Select…</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.display}
                                </option>
                            ))}
                        </select>
                    </div>
                    {sourceCategory ? (
                        <CategoryWizard
                            key={sourceCategory.id}
                            sourceCategory={sourceCategory}
                            categories={categories}
                            targetGameSlug={gameSlug}
                        />
                    ) : (
                        <p className={styles.muted}>
                            Pick a source category to reassign.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
