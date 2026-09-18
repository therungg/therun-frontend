import type { ReactNode } from 'react';
import type { SetupStepId } from '~src/lib/setup/completeness';
import styles from '../setup.module.scss';

interface Props {
    step: SetupStepId;
    title: ReactNode;
}

/**
 * Shared full-focus step header: just the job statement. The step rail owns
 * numbering and progress, so the header doesn't restate a number the sidebar
 * already shows right beside it.
 */
export function StepHeader({ step: _step, title }: Props) {
    return (
        <header className={styles.stepHeader}>
            <div className={styles.stepHeaderText}>
                <h2 className={styles.stepTitle}>{title}</h2>
            </div>
        </header>
    );
}
