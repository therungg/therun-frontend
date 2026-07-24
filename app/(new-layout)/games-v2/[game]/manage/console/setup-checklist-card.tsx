import { Check2, Dot } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import type {
    BoardCompleteness,
    SetupStepId,
} from '~src/lib/setup/completeness';
import styles from './console.module.scss';

const STEP_LABELS: Record<SetupStepId, string> = {
    details: 'Game details',
    categories: 'Categories',
    defaults: 'Defaults',
    exceptions: 'Exceptions',
    finish: 'Go live',
};

interface Props {
    gameSlug: string;
    completeness: BoardCompleteness;
}

export function SetupChecklistCard({ gameSlug, completeness }: Props) {
    const open = completeness.steps.filter((s) => s.status !== 'done');
    if (open.length === 0) return null;
    const pct = Math.round(
        (completeness.doneCount / completeness.totalCount) * 100,
    );

    return (
        <div className={styles.inlineCard}>
            <div className={styles.setupCardBody}>
                <div className={styles.setupCardHead}>
                    <div>
                        <span
                            className={styles.eyebrow}
                            style={{ display: 'block' }}
                        >
                            Setup
                        </span>
                        <strong>
                            {completeness.doneCount} of{' '}
                            {completeness.totalCount} steps done
                        </strong>
                    </div>
                    <Link
                        href={`/games-v2/${gameSlug}/setup${
                            completeness.firstIncomplete
                                ? `?step=${completeness.firstIncomplete}`
                                : ''
                        }`}
                        className={styles.setupCardAction}
                    >
                        {completeness.doneCount <= 1
                            ? 'Set up this board'
                            : 'Continue setup'}
                    </Link>
                </div>
                <div
                    className={styles.setupMeter}
                    role="progressbar"
                    aria-label="Setup progress"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                >
                    <div
                        className={styles.setupMeterFill}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <ul className={styles.setupSteps}>
                    {completeness.steps.map((s) => (
                        <li key={s.step} className={styles.setupStep}>
                            {s.status === 'done' ? (
                                <Check2
                                    size={12}
                                    className={styles.setupStepDone}
                                    aria-label="done"
                                />
                            ) : (
                                <Dot
                                    size={12}
                                    className={
                                        s.status === 'blocker'
                                            ? styles.setupStepBlocker
                                            : styles.setupStepTodo
                                    }
                                    aria-hidden
                                />
                            )}
                            <span className={styles.setupStepLabel}>
                                {STEP_LABELS[s.step]}
                            </span>
                            <span className={styles.setupStepSummary}>
                                {s.summary}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
