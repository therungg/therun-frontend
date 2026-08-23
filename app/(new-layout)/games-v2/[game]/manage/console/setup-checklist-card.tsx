import { Check2, Dot } from 'react-bootstrap-icons';
import styles from '~src/components/console-chrome/console.module.scss';
import Link from '~src/components/link';
import type { BoardCompleteness } from '~src/lib/setup/completeness';
import { SETUP_STEP_LABELS } from '~src/lib/setup/steps';

interface Props {
    gameSlug: string;
    completeness: BoardCompleteness;
}

export function SetupChecklistCard({ gameSlug, completeness }: Props) {
    // Only rendered while setup is unfinished (console-shell.tsx swaps in
    // BoardHealthCard once it is) — this card is the nudge, not the door. The
    // permanent way back into the wizard is the sidebar's "Setup wizard" item.
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
                            {`${completeness.doneCount} of ${completeness.totalCount} steps done`}
                        </strong>
                    </div>
                    <Link
                        href={`/games-v2/${encodeURIComponent(gameSlug)}/setup${
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
                                    aria-hidden
                                />
                            ) : (
                                <Dot
                                    size={12}
                                    className={
                                        s.status === 'blocker'
                                            ? styles.setupStepBlocker
                                            : s.status === 'warning'
                                              ? styles.setupStepWarning
                                              : styles.setupStepTodo
                                    }
                                    aria-hidden
                                />
                            )}
                            <span className={styles.setupStepLabel}>
                                {SETUP_STEP_LABELS[s.step]}
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
