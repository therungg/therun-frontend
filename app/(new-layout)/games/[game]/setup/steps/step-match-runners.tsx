'use client';

import { MatchRunnersPane } from '../../manage/match-runners/match-runners-pane';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

export function StepMatchRunners({ data, onAdvance }: StepProps) {
    return (
        <section>
            <StepHeader
                step="match-runners"
                title="Who are these runners on speedrun.com?"
            />
            <MatchRunnersPane gameSlug={data.game.name} />
            <button
                type="button"
                className={`${styles.primaryAction} mt-2`}
                onClick={onAdvance}
            >
                Continue
            </button>
        </section>
    );
}
