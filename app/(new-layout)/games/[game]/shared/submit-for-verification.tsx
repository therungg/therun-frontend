'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { loadPbSubmissionAction } from '~src/actions/pb-submission.action';
import { RUNNER_NEXT_STEP_LABEL } from '~src/lib/moderation/run-status-copy';
import type { PbSubmissionForm } from '../../../../../types/pb-submission.types';
import { SubmissionForm } from '../../../submissions/[runId]/submission-form';
import { BoardDialog } from './board-dialog';
import styles from './submit-for-verification.module.scss';

/**
 * Submit for verification, in place: the same form as /submissions/{runId},
 * in a dialog over the page the runner is on. `onDone` runs once it went
 * through, to refresh whatever shows the run's status; by default the page is
 * refreshed.
 */
export function SubmitForVerification({
    runId,
    className,
    onDone,
}: {
    runId: number;
    className: string;
    onDone?: () => Promise<void> | void;
}) {
    const router = useRouter();
    const titleId = useId();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<PbSubmissionForm | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Read fresh each time it opens: the board's rules and the run can change.
    const show = () => {
        setOpen(true);
        setForm(null);
        setError(null);
        loadPbSubmissionAction(runId).then((res) => {
            if (res.ok) setForm(res.form);
            else setError(res.error);
        });
    };

    const submitted = async () => {
        setOpen(false);
        if (onDone) await onDone();
        else router.refresh();
    };

    return (
        <>
            <button type="button" className={className} onClick={show}>
                {RUNNER_NEXT_STEP_LABEL.submit}
            </button>
            <BoardDialog
                open={open}
                onClose={() => setOpen(false)}
                labelledBy={titleId}
                size="lg"
                closeOnBackdropClick={false}
            >
                <div className={styles.header}>
                    <h5 id={titleId} className={styles.title}>
                        {RUNNER_NEXT_STEP_LABEL.submit}
                    </h5>
                </div>
                <div className={styles.body}>
                    {form ? (
                        <SubmissionForm form={form} onSubmitted={submitted} />
                    ) : (
                        <p
                            className={styles.message}
                            role={error ? 'alert' : undefined}
                        >
                            {error ?? 'Loading…'}
                        </p>
                    )}
                </div>
            </BoardDialog>
        </>
    );
}
