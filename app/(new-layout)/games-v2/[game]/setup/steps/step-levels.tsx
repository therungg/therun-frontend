'use client';

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
    return (
        <section>
            <StepHeader
                step="levels"
                title="Does this game have individual levels?"
            />
            <LevelsPane
                game={data.game}
                categories={data.categories}
                groups={data.groups}
                policies={data.policies}
                variables={data.variables}
                metadata={data.metadata}
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
