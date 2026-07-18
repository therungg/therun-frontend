'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Dropdown } from 'react-bootstrap';
import { ThreeDotsVertical } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import type { ModVerb } from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/action-model';
import { RunActionDialog } from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog';
import {
    appealRunAction,
    loadRunHistoryAction,
    reportRunAction,
} from '~src/actions/run-user-actions.action';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import type { HistoryEvent } from '../../../../../types/moderation.types';
import { isSameRunner } from '../shared/is-same-runner';
import {
    SelfRunVerdictDialog,
    useSelfRunVerdict,
} from '../shared/self-run-verdict';
import { HistoryDialog, ReasonDialog } from './row-action-dialogs';
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
    const isOwn = loggedIn && isSameRunner(entry.runnerName, sessionUsername);
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
                <Dropdown.Menu
                    className={styles.menu}
                    popperConfig={{ strategy: 'fixed' }}
                >
                    <Dropdown.Item
                        as="button"
                        type="button"
                        className={styles.item}
                        onClick={openHistory}
                    >
                        Run history
                    </Dropdown.Item>
                    {loggedIn && !isOwn && (
                        <Dropdown.Item
                            as="button"
                            type="button"
                            className={styles.item}
                            onClick={() => setModal('report')}
                        >
                            Report run
                        </Dropdown.Item>
                    )}
                    {isOwn && !isRejected && (
                        <Dropdown.Item
                            as="button"
                            type="button"
                            className={`${styles.item} ${styles.danger}`}
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
                                className={styles.item}
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
                                className={styles.item}
                                onClick={() => setModal('appeal')}
                            >
                                Appeal rejection
                            </Dropdown.Item>
                        </>
                    )}
                    {canManage && (
                        <>
                            <Dropdown.Divider className={styles.menuDivider} />
                            <Dropdown.Header className={styles.menuHeader}>
                                Moderator
                            </Dropdown.Header>
                            <Dropdown.Item
                                as="button"
                                type="button"
                                className={styles.item}
                                onClick={() => setModVerb('approve')}
                            >
                                Approve run
                            </Dropdown.Item>
                            <Dropdown.Item
                                as="button"
                                type="button"
                                className={`${styles.item} ${styles.danger}`}
                                onClick={() => setModVerb('remove')}
                            >
                                Remove run…
                            </Dropdown.Item>
                            {isRejected && (
                                <Dropdown.Item
                                    as="button"
                                    type="button"
                                    className={styles.item}
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

            <ReasonDialog
                open={modal === 'report'}
                onClose={close}
                labelledBy={`report-title-${runId}`}
                eyebrow="Report"
                title="Report this run"
                blurb="Tell the moderators why this run looks wrong (fake time, spliced video, wrong category…)."
                placeholder="Reason for report"
                submitLabel="Submit report"
                reason={reason}
                onReasonChange={setReason}
                onSubmit={submitReport}
                pending={pending}
            />

            <ReasonDialog
                open={modal === 'appeal'}
                onClose={close}
                labelledBy={`appeal-title-${runId}`}
                eyebrow="Appeal"
                title="Appeal rejection"
                blurb="Explain why this run should be reinstated. A moderator will review your appeal."
                placeholder="Why should this run be reinstated?"
                submitLabel="Submit appeal"
                reason={reason}
                onReasonChange={setReason}
                onSubmit={submitAppeal}
                pending={pending}
            />

            <HistoryDialog
                open={modal === 'history'}
                onClose={close}
                labelledBy={`history-title-${runId}`}
                history={history}
            />

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
