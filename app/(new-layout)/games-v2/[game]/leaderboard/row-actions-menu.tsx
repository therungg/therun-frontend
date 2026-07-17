'use client';

import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Dropdown, Form, Modal } from 'react-bootstrap';
import { ThreeDotsVertical } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import type { ModVerb } from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/action-model';
import { RunActionDialog } from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog';
import {
    appealRunAction,
    loadRunHistoryAction,
    reportRunAction,
} from '~src/actions/run-user-actions.action';
import { describeEvent } from '~src/lib/run-view/describe-event';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import type { HistoryEvent } from '../../../../../types/moderation.types';
import {
    SelfRunVerdictDialog,
    useSelfRunVerdict,
} from '../shared/self-run-verdict';
import styles from './row-actions-menu.module.scss';

interface Props {
    entry: LeaderboardEntry;
    sessionUsername: string | null;
    canManage?: boolean;
    gameSlug: string;
}

type ModalKind = 'report' | 'appeal' | 'history' | null;

export function RowActionsMenu({
    entry,
    sessionUsername,
    canManage,
    gameSlug,
}: Props) {
    const router = useRouter();
    const runId = entry.runId ?? null;
    const loggedIn = !!sessionUsername;
    const isOwn = loggedIn && entry.runnerName === sessionUsername;
    const isRejected = entry.verificationStatus === 'rejected';

    const [modal, setModal] = useState<ModalKind>(null);
    const [modVerb, setModVerb] = useState<ModVerb | null>(null);
    const [reason, setReason] = useState('');
    const [history, setHistory] = useState<HistoryEvent[] | null>(null);
    const [pending, startTransition] = useTransition();
    const selfVerdict = useSelfRunVerdict();

    // Manual-time entries have no finished_run to act on.
    if (runId == null) return null;

    const close = () => {
        setModal(null);
        setReason('');
    };
    const reasonValid = reason.trim().length >= 10;

    const openHistory = () => {
        setModal('history');
        setHistory(null);
        startTransition(async () => {
            const res = await loadRunHistoryAction(runId);
            if ('error' in res) {
                toast.error(res.error);
                setHistory([]);
            } else {
                setHistory(res.events);
            }
        });
    };

    const submitReport = () => {
        startTransition(async () => {
            const res = await reportRunAction(runId, reason);
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
            const res = await appealRunAction(runId, reason);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success('Appeal submitted. A moderator will review it.');
            close();
        });
    };

    return (
        <>
            <Dropdown align="end">
                <Dropdown.Toggle
                    as="button"
                    type="button"
                    id={`run-actions-${runId}`}
                    className={styles.toggle}
                    aria-label="Run actions"
                    title="Run actions"
                >
                    <ThreeDotsVertical aria-hidden size={16} />
                </Dropdown.Toggle>
                <Dropdown.Menu popperConfig={{ strategy: 'fixed' }}>
                    <Dropdown.Item
                        as="button"
                        type="button"
                        onClick={openHistory}
                    >
                        Run history
                    </Dropdown.Item>
                    {loggedIn && !isOwn && (
                        <Dropdown.Item
                            as="button"
                            type="button"
                            onClick={() => setModal('report')}
                        >
                            Report run
                        </Dropdown.Item>
                    )}
                    {isOwn && !isRejected && (
                        <Dropdown.Item
                            as="button"
                            type="button"
                            className="text-danger"
                            onClick={() =>
                                selfVerdict.requestVerdict(runId, 'reject')
                            }
                        >
                            Hide my run
                        </Dropdown.Item>
                    )}
                    {isOwn && isRejected && (
                        <>
                            <Dropdown.Item
                                as="button"
                                type="button"
                                onClick={() =>
                                    selfVerdict.requestVerdict(
                                        runId,
                                        'unreject',
                                    )
                                }
                            >
                                Restore my run
                            </Dropdown.Item>
                            <Dropdown.Item
                                as="button"
                                type="button"
                                onClick={() => setModal('appeal')}
                            >
                                Appeal rejection
                            </Dropdown.Item>
                        </>
                    )}
                    {canManage && (
                        <>
                            <Dropdown.Divider />
                            <Dropdown.Header>Moderator</Dropdown.Header>
                            <Dropdown.Item
                                as="button"
                                type="button"
                                onClick={() => setModVerb('approve')}
                            >
                                Approve run
                            </Dropdown.Item>
                            <Dropdown.Item
                                as="button"
                                type="button"
                                className="text-danger"
                                onClick={() => setModVerb('remove')}
                            >
                                Remove run…
                            </Dropdown.Item>
                            {isRejected && (
                                <Dropdown.Item
                                    as="button"
                                    type="button"
                                    onClick={() => setModVerb('restore')}
                                >
                                    Restore run
                                </Dropdown.Item>
                            )}
                        </>
                    )}
                </Dropdown.Menu>
            </Dropdown>

            {modVerb && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb={modVerb}
                    target={{
                        kind: 'runs',
                        runIds: [runId],
                        label: `${entry.runnerName}'s run`,
                    }}
                    onDone={() => {
                        setModVerb(null);
                        router.refresh();
                    }}
                    onClose={() => setModVerb(null)}
                />
            )}

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

            <Modal show={modal === 'history'} onHide={close} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="h6">Run history</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {history === null && (
                        <p className="text-muted small mb-0">Loading…</p>
                    )}
                    {history !== null && history.length === 0 && (
                        <p className="text-muted small mb-0">
                            No moderation history for this run.
                        </p>
                    )}
                    {history !== null && history.length > 0 && (
                        <ul className="list-unstyled mb-0">
                            {history.map((e, i) => (
                                <li
                                    key={`${e.at}-${i}`}
                                    className="border-start ps-3 pb-3 position-relative"
                                >
                                    <div className="fw-semibold small">
                                        {describeEvent(e)}
                                    </div>
                                    <div className="text-muted small">
                                        {e.byRole} · {moment(e.at).fromNow()}
                                    </div>
                                    {e.reason && (
                                        <div className="small fst-italic">
                                            “{e.reason}”
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Modal.Body>
            </Modal>

            <SelfRunVerdictDialog
                confirmState={selfVerdict.confirmState}
                pending={selfVerdict.pending}
                onCancel={selfVerdict.cancel}
                onConfirm={selfVerdict.confirm}
            />
        </>
    );
}
