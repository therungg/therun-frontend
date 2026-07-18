'use client';

import { useState, useTransition } from 'react';
import { Form, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
    appealRunAction,
    reportRunAction,
} from '~src/actions/run-user-actions.action';
import Link from '~src/components/link';
import { buildSubmitHref } from '~src/lib/board-url';
import { isSameRunner } from '../shared/is-same-runner';
import {
    SelfRunVerdictDialog,
    useSelfRunVerdict,
} from '../shared/self-run-verdict';
import type { RunViewModel } from './run-view';

type ModalKind = 'report' | 'appeal' | null;

export function RunActions({
    model,
    sessionUsername,
}: {
    model: RunViewModel;
    sessionUsername: string | null;
}) {
    const [modal, setModal] = useState<ModalKind>(null);
    const [reason, setReason] = useState('');
    const [pending, startTransition] = useTransition();
    const selfVerdict = useSelfRunVerdict();

    const isRun = model.kind === 'run';
    const isOwnRun = isRun && isSameRunner(sessionUsername, model.runnerName);
    const canReport = isRun && sessionUsername != null;
    const canAppeal = isOwnRun && model.verificationStatus === 'rejected';
    const canHide = isOwnRun && model.verificationStatus !== 'rejected';
    const canRestore = isOwnRun && model.verificationStatus === 'rejected';
    // RunViewModel carries no category slug (only categoryDisplay) — link
    // mode=claim alone rather than guess at the category from display text.
    const correctHref = buildSubmitHref(model.game.name, { mode: 'claim' });

    const close = () => {
        setModal(null);
        setReason('');
    };
    const reasonValid = reason.trim().length >= 10;

    const submitReport = () => {
        startTransition(async () => {
            const res = await reportRunAction(model.id, reason);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(
                res.reported
                    ? 'Report submitted. Thank you.'
                    : 'You have already reported this run.',
            );
            close();
        });
    };

    const submitAppeal = () => {
        startTransition(async () => {
            const res = await appealRunAction(model.id, reason);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success('Appeal submitted. A moderator will review it.');
            close();
        });
    };

    const copyLink = () => {
        navigator.clipboard
            .writeText(window.location.href)
            .then(() => toast.success('Link copied to clipboard.'))
            .catch(() => toast.error('Could not copy link.'));
    };

    return (
        <>
            <div className="d-flex flex-wrap gap-2">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={copyLink}
                >
                    Copy link
                </button>
                {canReport && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setModal('report')}
                    >
                        Report run
                    </button>
                )}
                {canAppeal && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setModal('appeal')}
                    >
                        Appeal rejection
                    </button>
                )}
                {isOwnRun && (
                    <Link
                        href={correctHref}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        Correct this time…
                    </Link>
                )}
                {canHide && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() =>
                            selfVerdict.requestVerdict(model.id, 'reject')
                        }
                    >
                        Hide my run
                    </button>
                )}
                {canRestore && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() =>
                            selfVerdict.requestVerdict(model.id, 'unreject')
                        }
                    >
                        Restore my run
                    </button>
                )}
            </div>

            <Modal show={modal === 'report'} onHide={close} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="h6">Report this run</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="small text-muted">
                        Tell the moderators why this run looks wrong (fake time,
                        spliced video, wrong category…). Minimum 10 characters.
                    </p>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={pending}
                        placeholder="Reason for report"
                    />
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={close}
                        disabled={pending}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={submitReport}
                        disabled={pending || !reasonValid}
                    >
                        Submit report
                    </button>
                </Modal.Footer>
            </Modal>

            <Modal show={modal === 'appeal'} onHide={close} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="h6">Appeal rejection</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="small text-muted">
                        Explain why this run should be reinstated. A moderator
                        will review your appeal. Minimum 10 characters.
                    </p>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={pending}
                        placeholder="Why should this run be reinstated?"
                    />
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={close}
                        disabled={pending}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={submitAppeal}
                        disabled={pending || !reasonValid}
                    >
                        Submit appeal
                    </button>
                </Modal.Footer>
            </Modal>

            <SelfRunVerdictDialog
                confirmState={selfVerdict.confirmState}
                pending={selfVerdict.pending}
                error={selfVerdict.error}
                onCancel={selfVerdict.cancel}
                onConfirm={selfVerdict.confirm}
            />
        </>
    );
}
