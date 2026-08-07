'use client';

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
import Link from '~src/components/link';
import { buildSubmitHref } from '~src/lib/board-url';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import type { HistoryEvent } from '../../../../../types/moderation.types';
import { isSameRunner } from '../shared/is-same-runner';
import {
    SelfRunVerdictDialog,
    useSelfRunVerdict,
} from '../shared/self-run-verdict';
import { buildSubcategoryKey } from '../submit/subcategory-key';
import { HistoryDialog, ReasonDialog } from './row-action-dialogs';
import styles from './row-actions-menu.module.scss';

// Shared react-bootstrap Dropdown popper config for the row kebabs. `fixed`
// so the panel escapes the table wrapper's overflow; `adaptive: false`
// because Popper's adaptive mode anchors a fixed-strategy popper against the
// wrong offset parent and parks it in the viewport corner. Non-adaptive emits
// plain viewport top/left (and, with gpuAcceleration off, no transform for a
// CSS animation to fight).
const MENU_POPPER = {
    strategy: 'fixed' as const,
    modifiers: [
        {
            name: 'computeStyles',
            options: { adaptive: false, gpuAcceleration: false },
        },
    ],
};

interface Props {
    entry: LeaderboardEntry;
    sessionUsername: string | null;
    canManage?: boolean;
    gameSlug: string;
    /** This row's own category (a board is single-category). */
    categorySlug: string;
    /** Subcategory-role variable names, for building this row's own subcategory key from `entry.variables`. */
    subcategoryDefKeys: string[];
    /** "Moderate…" — opens the run inspector drawer on this row. Omitted when the viewer can't manage runs. */
    onModerate?: () => void;
}

type ModalKind = 'report' | 'appeal' | 'history' | null;

export function RowActionsMenu({
    entry,
    sessionUsername,
    canManage,
    gameSlug,
    categorySlug,
    subcategoryDefKeys,
    onModerate,
}: Props) {
    const runId = entry.runId ?? null;
    const loggedIn = !!sessionUsername;
    const isOwn = loggedIn && isSameRunner(entry.runnerName, sessionUsername);
    const isRejected = entry.verificationStatus === 'rejected';
    // The entry's own subcategory, not the board's active filter — a
    // "combined" or filtered view can show entries from other slices.
    const entrySubcategoryKey = buildSubcategoryKey(
        Object.fromEntries(
            Object.entries(entry.variables ?? {}).filter(([k]) =>
                subcategoryDefKeys.includes(k),
            ),
        ),
    );
    const correctHref = buildSubmitHref(gameSlug, {
        categorySlug,
        subcategoryKey: entrySubcategoryKey,
        mode: 'claim',
    });

    const [modal, setModal] = useState<ModalKind>(null);
    const [reason, setReason] = useState('');
    const [history, setHistory] = useState<HistoryEvent[] | null>(null);
    const [pending, startTransition] = useTransition();
    const selfVerdict = useSelfRunVerdict();

    // Manual-time entries have no finished_run. Their moderation lives in the
    // set-time inspector (ManualInspector) opened via Moderate…, so the kebab
    // is just the entry point plus a link to the set-time detail page.
    if (runId == null) {
        if (!canManage || entry.manualTimeId == null) return null;
        return (
            <Dropdown align="end">
                <Dropdown.Toggle
                    as="button"
                    type="button"
                    id={`manual-actions-${entry.manualTimeId}`}
                    className={styles.toggle}
                    aria-label="Set-time actions"
                    title="Set-time actions"
                >
                    <ThreeDotsVertical aria-hidden size={16} />
                </Dropdown.Toggle>
                <Dropdown.Menu
                    className={styles.menu}
                    popperConfig={MENU_POPPER}
                >
                    <Dropdown.Item
                        as={Link}
                        className={styles.item}
                        href={`/games-v2/${encodeURIComponent(gameSlug)}/manual/${entry.manualTimeId}`}
                    >
                        View set time
                    </Dropdown.Item>
                    {onModerate && (
                        <>
                            <Dropdown.Divider className={styles.menuDivider} />
                            <Dropdown.Header className={styles.menuHeader}>
                                Moderator
                            </Dropdown.Header>
                            <Dropdown.Item
                                as="button"
                                type="button"
                                className={styles.item}
                                onClick={onModerate}
                            >
                                Moderate…
                            </Dropdown.Item>
                        </>
                    )}
                </Dropdown.Menu>
            </Dropdown>
        );
    }

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
                    popperConfig={MENU_POPPER}
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
                    {isOwn && (
                        <Dropdown.Item
                            as={Link}
                            href={correctHref}
                            className={styles.item}
                        >
                            Correct this time…
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
                            {onModerate && (
                                <Dropdown.Item
                                    as="button"
                                    type="button"
                                    className={styles.item}
                                    onClick={onModerate}
                                >
                                    Moderate…
                                </Dropdown.Item>
                            )}
                        </>
                    )}
                </Dropdown.Menu>
            </Dropdown>

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
