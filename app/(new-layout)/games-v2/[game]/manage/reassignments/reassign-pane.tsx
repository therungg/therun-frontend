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
                    className={`${styles.modeButton} ${
                        mode === 'game' ? styles.modeActive : ''
                    }`}
                    onClick={() => setMode('game')}
                >
                    Reassign game
                </button>
                <button
                    type="button"
                    className={`${styles.modeButton} ${
                        mode === 'category' ? styles.modeActive : ''
                    }`}
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
                <>
                    <div className={styles.surface}>
                        <div className={styles.header}>
                            <p className={styles.eyebrow}>
                                Category reassignment
                            </p>
                            <h3 className={styles.title}>
                                Pick a source category
                            </h3>
                            <p className={styles.subtitle}>
                                Choose which category to merge into another.
                            </p>
                        </div>
                        <div className={styles.step}>
                            <label
                                htmlFor="source-cat"
                                className={styles.label}
                            >
                                Source category
                            </label>
                            <select
                                id="source-cat"
                                className={styles.select}
                                value={sourceCategoryId ?? ''}
                                onChange={(e) =>
                                    setSourceCategoryId(
                                        e.target.value
                                            ? Number(e.target.value)
                                            : null,
                                    )
                                }
                            >
                                <option value="">Select a category…</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.display}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {sourceCategory && (
                        <CategoryWizard
                            key={sourceCategory.id}
                            sourceCategory={sourceCategory}
                            categories={categories}
                            targetGameSlug={gameSlug}
                        />
                    )}
                </>
            )}
        </div>
    );
}
