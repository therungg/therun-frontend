import Link from '~src/components/link';
import {
    RUNNER_NEXT_STEP_LABEL,
    runnerStatusHint,
    runnerStatusLabel,
} from '~src/lib/moderation/run-status-copy';
import { runnerProfileHref } from '~src/lib/runner-profile-href';
import type { RunnerNextStep } from '../../../../../types/runner-status.types';
import { isSameRunner } from '../shared/is-same-runner';
import { SubmitForVerification } from '../shared/submit-for-verification';
import { EvidenceDialog } from './evidence-dialog';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

// The run detail carries the derived next step, not the raw hold reason the
// hint copy is keyed on; each fixable step stands for exactly one reason.
const STEP_REASON: Partial<Record<RunnerNextStep, string>> = {
    add_video: 'missing_video',
    submit: 'awaiting_runner',
    fix_runners: 'participants_incomplete',
};

/**
 * Your own run's status in your terms, and the one thing to do about it.
 * Renders nothing unless the viewer filed this run. Appeal and Put back on
 * the boards live in the action row, so they are not repeated here.
 */
export function OwnerStatus({
    model,
    sessionUsername,
    isMod,
}: {
    model: RunViewModel;
    sessionUsername: string | null;
    isMod: boolean;
}) {
    const isOwner =
        isSameRunner(sessionUsername, model.runnerName) &&
        model.userId != null &&
        !model.isGuest;
    const status = model.runnerStatus;
    if (!isOwner || status == null) return null;

    const step = model.runnerNextStep;
    const reason =
        status === 'rejected'
            ? model.rejectionReason
            : step
              ? (STEP_REASON[step] ?? null)
              : null;
    const hint = runnerStatusHint(status, reason, step);

    return (
        <section className={styles.ownerStatus} aria-label="Your run">
            <div className={styles.ownerStatusText}>
                <span className={styles.panelEyebrow}>Your run</span>
                <span className={styles.ownerStatusLabel}>
                    {runnerStatusLabel(status, step)}
                </span>
                {hint && <span className={styles.muted}>{hint}</span>}
            </div>
            <div className={styles.ownerStatusActions}>
                {step === 'add_video' && (
                    <EvidenceDialog
                        model={model}
                        sessionUsername={sessionUsername}
                        isMod={isMod}
                        label={RUNNER_NEXT_STEP_LABEL.add_video}
                    />
                )}
                {step === 'submit' && (
                    <SubmitForVerification
                        runId={model.id}
                        className={styles.pill}
                        gameDisplay={model.game.display}
                        gameImage={model.game.image ?? null}
                        boardLabel={model.categoryDisplay}
                        timing={
                            model.game.primaryTiming === 'gt'
                                ? 'gametime'
                                : 'realtime'
                        }
                        gameTimeLabel={model.gameTimeLabel}
                    />
                )}
                <Link
                    href={runnerProfileHref(model.runnerName)}
                    className={styles.panelHeadLink}
                >
                    All your runs
                </Link>
            </div>
        </section>
    );
}
