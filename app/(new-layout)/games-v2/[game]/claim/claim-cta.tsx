'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { submitBoardClaimAction } from './actions/submit-claim.action';

export interface ClaimCtaState {
    gameId: number;
    hasModerators: boolean;
    myClaimPending: boolean;
}

interface Props {
    claim: ClaimCtaState;
    gameDisplay: string;
}

export function ClaimCta({ claim, gameDisplay }: Props) {
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(claim.myClaimPending);
    const [motivation, setMotivation] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, startSubmitting] = useTransition();

    if (pending) {
        return (
            <span className="btn btn-sm btn-outline-secondary disabled">
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
                className="btn btn-sm btn-outline-primary"
                onClick={() => setOpen(true)}
            >
                {label}
            </button>
            {open && (
                <div
                    className="modal d-block"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                    role="dialog"
                    aria-modal
                >
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {claim.hasModerators
                                        ? `Join the ${gameDisplay} mod team`
                                        : `Moderate ${gameDisplay}`}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Close"
                                    onClick={() => setOpen(false)}
                                />
                            </div>
                            <div className="modal-body">
                                <p className="text-muted small">
                                    {claim.hasModerators
                                        ? 'Your application goes to this board’s moderators.'
                                        : 'This board has no moderators yet. Tell the site admins why you’re a good fit — your run history here is attached automatically.'}
                                </p>
                                <textarea
                                    className="form-control"
                                    rows={5}
                                    value={motivation}
                                    onChange={(e) =>
                                        setMotivation(e.target.value)
                                    }
                                    placeholder="Why do you want to moderate this board?"
                                />
                                {error && (
                                    <div className="alert alert-danger mt-2 mb-0 py-2">
                                        {error}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={
                                        isSubmitting ||
                                        motivation.trim().length < 10
                                    }
                                    onClick={submit}
                                >
                                    {isSubmitting
                                        ? 'Submitting…'
                                        : 'Submit application'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
