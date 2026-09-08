'use client';

import { useLevelOverview } from '../../manage/levels/use-level-overview';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { LevelsEditor } from './levels-editor';
import { StepHeader } from './step-header';

export function StepLevels({ data, onAdvance }: StepProps) {
    const { overview, reload } = useLevelOverview(data.game.name, data.game.id);

    return (
        <section>
            <StepHeader
                step="levels"
                title="Does this game have individual levels?"
            />
            <div className={styles.stepBody}>
                <LevelsEditor
                    mode="setup"
                    gameSlug={data.game.name}
                    gameId={data.game.id}
                    overview={overview}
                    onSaved={reload}
                    onSkip={onAdvance}
                />
            </div>
        </section>
    );
}
