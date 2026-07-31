import type { ReactNode } from 'react';
import type { SetupStepId } from '~src/lib/setup/completeness';
import { setupStepMeta } from '~src/lib/setup/steps';
import styles from '../setup.module.scss';

interface Props {
    step: SetupStepId;
    title: ReactNode;
}

/**
 * Shared full-focus step header: ghost numeral + job statement.
 * The numeral comes from steps.ts rather than a literal, so inserting a step
 * renumbers every header at once.
 */
export function StepHeader({ step, title }: Props) {
    const { num } = setupStepMeta(step);
    return (
        <header className={styles.stepHeader}>
            <span className={styles.ghostNum} aria-hidden>
                {String(num).padStart(2, '0')}
            </span>
            <div className={styles.stepHeaderText}>
                <h2 className={styles.stepTitle}>{title}</h2>
            </div>
        </header>
    );
}
