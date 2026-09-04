'use client';

import consoleStyles from '~src/components/console-chrome/console.module.scss';
import { InlineError } from '../shared/form-kit';
import { ExclusionMatrix } from './exclusion-matrix';
import styles from './levels.module.scss';
import { LevelsTable } from './levels-table';
import { SubcategoriesTable } from './subcategories-table';
import { useLevelOverview } from './use-level-overview';

interface Props {
    gameId: number;
    gameSlug: string;
}

/**
 * A board's individual levels: the levels themselves, the subcategories every
 * level shares, and which level carries which. Every add, rename and remove
 * writes immediately — there is no separate save step, unlike the wizard's
 * first-setup flow (levels-editor.tsx), which this pane does not share code
 * with.
 */
export function LevelsPane({ gameId, gameSlug }: Props) {
    const { overview, loading, error, reload } = useLevelOverview(
        gameSlug,
        gameId,
    );

    return (
        <div className={consoleStyles.surface}>
            <div className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Structure</div>
                    <h2 className={consoleStyles.paneTitle}>Levels</h2>
                </div>
            </div>

            {loading && !overview && (
                <p className={styles.empty}>Loading levels…</p>
            )}
            <InlineError>{error}</InlineError>

            {overview && (
                <>
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Levels</h3>
                        <LevelsTable
                            gameId={gameId}
                            gameSlug={gameSlug}
                            levels={overview.levels}
                            templates={overview.templates}
                            onChanged={reload}
                        />
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Subcategories</h3>
                        <SubcategoriesTable
                            gameId={gameId}
                            gameSlug={gameSlug}
                            templates={overview.templates}
                            onChanged={reload}
                        />
                    </div>

                    <ExclusionMatrix
                        gameId={gameId}
                        gameSlug={gameSlug}
                        levels={overview.levels}
                        templates={overview.templates}
                        onChanged={reload}
                    />
                </>
            )}
        </div>
    );
}
