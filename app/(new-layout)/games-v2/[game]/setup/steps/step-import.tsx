'use client';

import { ImportSections } from '../../manage/src-import/src-import-pane';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

/**
 * Step 1: bring the board in from its source before anything is set by hand.
 * Settings first — categories, levels, subcategories, rules, timing — then the
 * runs of the runners who have a therun account, which land in the categories
 * the settings import made. Both sections are the console's Import pane; only
 * its chrome is left behind.
 *
 * Skippable like every other step: a board with no source, or one a moderator
 * would rather build by hand, moves straight on to Game details.
 */
export function StepImport({ data }: StepProps) {
    return (
        <section>
            <StepHeader
                step="import"
                title={`Import ${data.game.display} from speedrun.com`}
            />
            <div className={styles.stepBody}>
                <ImportSections
                    gameId={data.game.id}
                    gameSlug={data.game.name}
                    isAdmin={data.canBypassImportCooldown}
                />
            </div>
        </section>
    );
}
