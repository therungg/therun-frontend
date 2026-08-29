'use client';

import { useState } from 'react';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { LevelTemplate } from '../../../../../../types/levels.types';
import { LevelCategoriesPane } from './level-categories-pane';
import { LevelsPane } from './levels-pane';
import styles from './levels-section.module.scss';

type LevelsTab = 'levels' | 'templates';

interface Props {
    gameId: number;
    gameSlug: string;
    templates: LevelTemplate[];
    /** ?pane=level-categories deep links land on the templates tab. */
    initialTab?: LevelsTab;
}

/**
 * One door for both level surfaces: the levels themselves and the level
 * categories (the templates every level's boards are materialised from).
 * They used to be two near-identically named sidebar items; the split is
 * now a tab inside the pane, where the relationship is visible.
 */
export function LevelsSection({
    gameId,
    gameSlug,
    templates,
    initialTab = 'levels',
}: Props) {
    const [tab, setTab] = useState<LevelsTab>(initialTab);

    return (
        <div>
            <div role="tablist" aria-label="Levels" className={styles.tabs}>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'levels'}
                    className={styles.tab}
                    onClick={() => setTab('levels')}
                >
                    {CONCEPT_LABEL.levels}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'templates'}
                    className={styles.tab}
                    onClick={() => setTab('templates')}
                >
                    {CONCEPT_LABEL['level-categories']}
                </button>
            </div>
            {tab === 'levels' ? (
                <LevelsPane
                    gameId={gameId}
                    gameSlug={gameSlug}
                    templates={templates}
                />
            ) : (
                <LevelCategoriesPane gameId={gameId} gameSlug={gameSlug} />
            )}
        </div>
    );
}
