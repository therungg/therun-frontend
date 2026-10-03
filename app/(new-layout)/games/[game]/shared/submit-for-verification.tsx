'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { loadPbSubmissionAction } from '~src/actions/pb-submission.action';
import { RUNNER_NEXT_STEP_LABEL } from '~src/lib/moderation/run-status-copy';
import type { ModTiming } from '../../../../../types/moderation.types';
import type { PbSubmissionForm } from '../../../../../types/pb-submission.types';
import {
    PrefilledSubmitForm,
    PrefilledSubmitHeader,
} from '../submit-dialog/prefilled-submit';
import styles from '../submit-dialog/submit-run-dialog.module.scss';
import { BoardDialog } from './board-dialog';

/**
 * Submit for verification, in place: Submit a run over the page the runner
 * is on, with this run's time and video filled in. `onDone` runs once it went
 * through, to refresh whatever shows the run's status; by default the page is
 * refreshed.
 */
export function SubmitForVerification({
    runId,
    className,
    gameDisplay = null,
    gameImage = null,
    boardLabel = null,
    timing,
    gameTimeLabel,
    onDone,
}: {
    runId: number;
    className: string;
    gameDisplay?: string | null;
    gameImage?: string | null;
    boardLabel?: string | null;
    timing?: ModTiming;
    gameTimeLabel?: string;
    onDone?: () => Promise<void> | void;
}) {
    const router = useRouter();
    const titleId = useId();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<PbSubmissionForm | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Read fresh each time it opens: the run can change in between.
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
                <PrefilledSubmitHeader
                    titleId={titleId}
                    gameDisplay={gameDisplay}
                    gameImage={gameImage}
                    boardLabel={boardLabel}
                />
                {form ? (
                    <PrefilledSubmitForm
                        form={form}
                        timing={timing}
                        gameTimeLabel={gameTimeLabel}
                        onCancel={() => setOpen(false)}
                        onSubmitted={submitted}
                    />
                ) : (
                    <div className={styles.body}>
                        {error ? (
                            <div className={styles.errorAlert} role="alert">
                                {error}
                            </div>
                        ) : (
                            <p className={styles.hint}>Loading…</p>
                        )}
                    </div>
                )}
            </BoardDialog>
        </>
    );
}
