'use client';

import { type KeyboardEvent, useState } from 'react';
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
const TAB_IDS: Record<LevelsTab, { tab: string; panel: string }> = {
    levels: { tab: 'levels-tab-levels', panel: 'levels-panel-levels' },
    templates: { tab: 'levels-tab-templates', panel: 'levels-panel-templates' },
};

export function LevelsSection({
    gameId,
    gameSlug,
    templates,
    initialTab = 'levels',
}: Props) {
    const [tab, setTab] = useState<LevelsTab>(initialTab);

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const next: LevelsTab = tab === 'levels' ? 'templates' : 'levels';
        setTab(next);
        document.getElementById(TAB_IDS[next].tab)?.focus();
    };

    return (
        <div>
            <div role="tablist" aria-label="Levels" className={styles.tabs}>
                <button
                    id={TAB_IDS.levels.tab}
                    type="button"
                    role="tab"
                    aria-selected={tab === 'levels'}
                    aria-controls={TAB_IDS.levels.panel}
                    tabIndex={tab === 'levels' ? 0 : -1}
                    className={styles.tab}
                    onClick={() => setTab('levels')}
                    onKeyDown={handleKeyDown}
                >
                    {CONCEPT_LABEL.levels}
                </button>
                <button
                    id={TAB_IDS.templates.tab}
                    type="button"
                    role="tab"
                    aria-selected={tab === 'templates'}
                    aria-controls={TAB_IDS.templates.panel}
                    tabIndex={tab === 'templates' ? 0 : -1}
                    className={styles.tab}
                    onClick={() => setTab('templates')}
                    onKeyDown={handleKeyDown}
                >
                    {CONCEPT_LABEL['level-categories']}
                </button>
            </div>
            {tab === 'levels' ? (
                <div
                    role="tabpanel"
                    id={TAB_IDS.levels.panel}
                    aria-labelledby={TAB_IDS.levels.tab}
                >
                    <LevelsPane
                        gameId={gameId}
                        gameSlug={gameSlug}
                        templates={templates}
                    />
                </div>
            ) : (
                <div
                    role="tabpanel"
                    id={TAB_IDS.templates.panel}
                    aria-labelledby={TAB_IDS.templates.tab}
                >
                    <LevelCategoriesPane gameId={gameId} gameSlug={gameSlug} />
                </div>
            )}
        </div>
    );
}
