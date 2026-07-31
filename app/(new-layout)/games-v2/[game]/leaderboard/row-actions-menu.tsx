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
import Link from '~src/components/link';
import { buildSubmitHref } from '~src/lib/board-url';
import type {
    LeaderboardEntry,
    ResolvedCategory,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import type { HistoryEvent } from '../../../../../types/moderation.types';
import { AdjustDialog } from '../manage/boards/adjust-dialog';
import { MoveDialog } from '../manage/boards/move-dialog';
import { RunnerDialog } from '../manage/boards/runner-dialog';
import { markRunsAction } from '../manage/moderation/shared/actions/marks.action';
import { isSameRunner } from '../shared/is-same-runner';
import {
    SelfRunVerdictDialog,
    useSelfRunVerdict,
} from '../shared/self-run-verdict';
import { buildSubcategoryKey } from '../submit/subcategory-key';
import { loadModBoardContextAction } from './actions/load-mod-board-context.action';
import { entryToRosterRow } from './mod-row';
import { HistoryDialog, ReasonDialog } from './row-action-dialogs';
import styles from './row-actions-menu.module.scss';

interface Props {
    entry: LeaderboardEntry;
    sessionUsername: string | null;
    canManage?: boolean;
    /** Admins only — shows RunnerDialog's "Entire site" scope. */
    canSiteBan?: boolean;
    gameSlug: string;
    /** This row's own category (a board is single-category). */
    categorySlug: string;
    /** Subcategory-role variable names, for building this row's own subcategory key from `entry.variables`. */
    subcategoryDefKeys: string[];
}

type ModalKind = 'report' | 'appeal' | 'history' | null;
type ModDialogKind = 'move' | 'adjust' | 'runner';

interface ModBoardContext {
    categories: ResolvedCategory[];
    variables: VariableRow[];
}

export function RowActionsMenu({
    entry,
    sessionUsername,
    canManage,
    canSiteBan = false,
    gameSlug,
    categorySlug,
    subcategoryDefKeys,
}: Props) {
    const router = useRouter();
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
    const [modVerb, setModVerb] = useState<ModVerb | null>(null);
    const [reason, setReason] = useState('');
    const [history, setHistory] = useState<HistoryEvent[] | null>(null);
    const [pending, startTransition] = useTransition();
    const selfVerdict = useSelfRunVerdict();

    // Console-parity mod dialogs (Move/Adjust/Runner) — their board context
    // (categories + variable defs) loads lazily on first open and is cached
    // for the page's lifetime, so the public payload stays visitor-sized.
    const [modCtx, setModCtx] = useState<ModBoardContext | null>(null);
    const [modDialog, setModDialog] = useState<ModDialogKind | null>(null);
    const [_ctxPending, startCtxLoad] = useTransition();
    const [_markPending, startMark] = useTransition();

    // Manual-time entries have no finished_run to act on.
    if (runId == null) return null;

    const rosterRow = entryToRosterRow(entry, entrySubcategoryKey);
    const modCategory =
        modCtx?.categories.find((c) => c.name === categorySlug) ?? null;

    const openModDialog = (kind: ModDialogKind) => {
        if (modCtx != null) {
            if (modCategory == null) {
                toast.error("Could not resolve this board's category.");
                return;
            }
            setModDialog(kind);
            return;
        }
        startCtxLoad(async () => {
            const res = await loadModBoardContextAction(gameSlug);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            const ctx = {
                categories: res.categories,
                variables: res.variables,
            };
            if (!ctx.categories.some((c) => c.name === categorySlug)) {
                setModCtx(ctx);
                toast.error("Could not resolve this board's category.");
                return;
            }
            setModCtx(ctx);
            setModDialog(kind);
        });
    };

    const markForLater = () => {
        startMark(async () => {
            const res = await markRunsAction(gameSlug, [runId], true);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(
                "Marked for later — it's in the console's marked pile.",
            );
        });
    };

    const modTimeMs =
        modCategory?.primaryTiming === 'gt'
            ? (rosterRow?.gameTime ?? null)
            : (rosterRow?.time ?? null);

    const onModMutated = () => {
        setModDialog(null);
        router.refresh();
    };

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
                    // `fixed` so the panel escapes the table wrapper's
                    // overflow. `adaptive: false` because Popper's adaptive
                    // mode anchors with `inset: auto 0 0 auto` and expresses
                    // the real offset as a delta measured against
                    // `getOffsetParent(popper).clientWidth/clientHeight` —
                    // and for a fixed-strategy popper that offsetParent is
                    // not the box the browser resolves `right/bottom: 0`
                    // against. The two disagreed, parking the menu in the
                    // viewport corner instead of beside its toggle.
                    // Non-adaptive emits plain viewport `top`/`left`
                    // (and, with gpuAcceleration off, no transform at all,
                    // so no CSS animation can fight it for the property).
                    popperConfig={{
                        strategy: 'fixed',
                        modifiers: [
                            {
                                name: 'computeStyles',
                                options: {
                                    adaptive: false,
                                    gpuAcceleration: false,
                                },
                            },
                        ],
                    }}
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
                            <Dropdown.Item
                                as="button"
                                type="button"
                                className={styles.item}
                                onClick={() => openModDialog('move')}
                            >
                                Move…
                            </Dropdown.Item>
                            <Dropdown.Item
                                as="button"
                                type="button"
                                className={styles.item}
                                onClick={() => openModDialog('adjust')}
                            >
                                {entry.userId == null
                                    ? 'Set time…'
                                    : 'Adjust time…'}
                            </Dropdown.Item>
                            {entry.userId != null && (
                                <Dropdown.Item
                                    as="button"
                                    type="button"
                                    className={styles.item}
                                    onClick={() => openModDialog('runner')}
                                >
                                    Runner…
                                </Dropdown.Item>
                            )}
                            <Dropdown.Item
                                as="button"
                                type="button"
                                className={styles.item}
                                onClick={markForLater}
                            >
                                Mark for later
                            </Dropdown.Item>
                        </>
                    )}
                </Dropdown.Menu>
            </Dropdown>

            {modCtx != null && modCategory != null && rosterRow != null && (
                <>
                    <MoveDialog
                        open={modDialog === 'move'}
                        onClose={() => setModDialog(null)}
                        row={rosterRow}
                        category={modCategory}
                        categories={modCtx.categories}
                        variables={modCtx.variables}
                        subcategoryKey={entrySubcategoryKey}
                        gameSlug={gameSlug}
                        onMutated={onModMutated}
                    />
                    <AdjustDialog
                        open={modDialog === 'adjust'}
                        onClose={() => setModDialog(null)}
                        row={rosterRow}
                        category={modCategory}
                        gameSlug={gameSlug}
                        subcategoryKey={entrySubcategoryKey}
                        timeMs={modTimeMs}
                        onMutated={onModMutated}
                    />
                    {rosterRow.userId != null && (
                        <RunnerDialog
                            open={modDialog === 'runner'}
                            onClose={() => setModDialog(null)}
                            row={rosterRow}
                            category={modCategory}
                            variables={modCtx.variables}
                            gameSlug={gameSlug}
                            subcategoryKey={entrySubcategoryKey}
                            canSiteBan={canSiteBan}
                            onMutated={onModMutated}
                        />
                    )}
                </>
            )}

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
