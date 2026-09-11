'use client';

import { useRouter } from 'next/navigation';
import { LevelsPane } from '../../manage/levels/levels-pane';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

/**
 * The console's Levels pane, as is — same levels table, same subcategories,
 * same matrix. Every write re-reads the wizard's server data so the new
 * level lands in the table and in the rail's count.
 */
export function StepLevels({ data, onAdvance }: StepProps) {
    const router = useRouter();

    return (
        <section>
            <StepHeader
                step="levels"
                title="Does this game have individual levels?"
            />
            <LevelsPane
                gameId={data.game.id}
                gameSlug={data.game.name}
                game={data.game}
                rows={data.manageRows}
                groups={data.manageGroups}
                boardCategories={data.categories}
                policies={data.policies}
                variables={data.variables}
                onChanged={() => router.refresh()}
            />
            <button
                type="button"
                className={styles.primaryAction}
                onClick={onAdvance}
            >
                Continue
            </button>
        </section>
    );
}
