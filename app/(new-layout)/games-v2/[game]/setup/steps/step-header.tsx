import type { ReactNode } from 'react';
import styles from '../setup.module.scss';

interface Props {
    num: number;
    title: ReactNode;
    lede?: ReactNode;
}

/** Shared full-focus step header: ghost numeral + job statement + context. */
export function StepHeader({ num, title, lede }: Props) {
    return (
        <header className={styles.stepHeader}>
            <span className={styles.ghostNum} aria-hidden>
                {String(num).padStart(2, '0')}
            </span>
            <div className={styles.stepHeaderText}>
                <h2 className={styles.stepTitle}>{title}</h2>
                {lede && <p className={styles.stepLede}>{lede}</p>}
            </div>
        </header>
    );
}
