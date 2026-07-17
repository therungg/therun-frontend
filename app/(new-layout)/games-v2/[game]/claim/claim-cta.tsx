'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { BoardDialog } from '../shared/board-dialog';
import { submitBoardClaimAction } from './actions/submit-claim.action';
import styles from './claim-cta.module.scss';

export interface ClaimCtaState {
    gameId: number;
    hasModerators: boolean;
    myClaimPending: boolean;
}

interface Props {
    claim: ClaimCtaState;
    gameDisplay: string;
    triggerClassName?: string;
}

export function ClaimCta({
    claim,
    gameDisplay,
    triggerClassName = 'btn btn-sm btn-outline-secondary',
}: Props) {
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(claim.myClaimPending);
    const [motivation, setMotivation] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, startSubmitting] = useTransition();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    if (pending) {
        return (
            <span className="text-muted small align-self-center">
                Application pending
            </span>
        );
    }

    const label = claim.hasModerators
        ? 'Apply to join the mod team'
        : 'Apply to moderate';

    const submit = () => {
        startSubmitting(async () => {
            setError(null);
            const res = await submitBoardClaimAction({
                gameId: claim.gameId,
                motivation,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success('Application submitted.');
            setPending(true);
            setOpen(false);
        });
    };

    return (
        <>
            <button
                type="button"
                className={triggerClassName}
                onClick={() => setOpen(true)}
            >
                {label}
            </button>
            <BoardDialog
                open={open}
                onClose={() => setOpen(false)}
                labelledBy="claim-cta-title"
                size="md"
                initialFocusRef={textareaRef}
                closeOnBackdropClick={!isSubmitting}
            >
                <div className={styles.header}>
                    <h5 className={styles.title} id="claim-cta-title">
                        {claim.hasModerators
                            ? `Join the ${gameDisplay} mod team`
                            : `Moderate ${gameDisplay}`}
                    </h5>
                </div>
                <div className={styles.body}>
                    <p className={styles.blurb}>
                        {claim.hasModerators
                            ? 'Your application goes to this board’s moderators.'
                            : 'This board has no moderators yet. Tell the site admins why you’re a good fit — your run history here is attached automatically.'}
                    </p>
                    <textarea
                        ref={textareaRef}
                        className={styles.textarea}
                        rows={5}
                        value={motivation}
                        onChange={(e) => setMotivation(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="Why do you want to moderate this board?"
                    />
                    {error && <div className={styles.error}>{error}</div>}
                </div>
                <div className={styles.footer}>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setOpen(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={isSubmitting || motivation.trim().length < 10}
                        onClick={submit}
                    >
                        {isSubmitting ? 'Submitting…' : 'Submit application'}
                    </button>
                </div>
            </BoardDialog>
        </>
    );
}
