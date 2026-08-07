'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Dropdown } from 'react-bootstrap';
import { ClockHistory, ThreeDotsVertical } from 'react-bootstrap-icons';
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
import { ManualTimeDialog } from '../manage/moderation/shared/manual-time-dialog';
import { isSameRunner } from '../shared/is-same-runner';
import {
    SelfRunVerdictDialog,
    useSelfRunVerdict,
} from '../shared/self-run-verdict';
import { buildSubcategoryKey } from '../submit/subcategory-key';
import { loadModBoardContextAction } from './actions/load-mod-board-context.action';
import { HideIdentityDialog } from './hide-identity-dialog';
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
    /** "Select all runs by …" — the kebab's shortcut to the single-runner bulk-bar state. Omitted when the viewer can't manage runs. */
    onSelectRunner?: () => void;
}

type ModalKind = 'report' | 'appeal' | 'history' | null;
type ModDialogKind = 'move' | 'adjust' | 'runner' | 'hide-identity';

interface ModBoardContext {
    gameDisplay: string;
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
    onSelectRunner,
}: Props) {
    const router = useRouter();
    const runId = entry.runId ?? null;
    const loggedIn = !!sessionUsername;
    const isOwn = loggedIn && isSameRunner(entry.runnerName, sessionUsername);
    const isRejected = entry.verificationStatus === 'rejected';
    // Provenance cue (design doc §F / mocks fig. 1): a trailing-cell marker
    // on rows with public moderation history, opening this same
    // HistoryDialog. The paginated LeaderboardEntry carries no explicit
    // "has history" flag (board-override/move don't change any field this
    // list reads), so — per the workstream's own fallback guidance — this
    // uses the one signal that's actually available without a per-row
    // fetch: a `rejected` verdict is itself a history event, so any
    // rejected run that's visible at all is guaranteed to have at least one
    // entry. Manual-time rows (no runId) can't open this dialog at all, so
    // they're excluded regardless of status.
    const hasKnownHistory = runId != null && isRejected;
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

    // Manual-time entries have no finished_run — they get their own menu
    // (verdicts/delete/edit go to the manual-times endpoints instead).
    if (runId == null) {
        if (!canManage || entry.manualTimeId == null) return null;
        return (
            <ManualRowActionsMenu
                entry={entry}
                manualTimeId={entry.manualTimeId}
                gameSlug={gameSlug}
                categorySlug={categorySlug}
                subcategoryKey={entrySubcategoryKey}
            />
        );
    }

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
                gameDisplay: res.gameDisplay,
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
            {hasKnownHistory && (
                <button
                    type="button"
                    className={styles.provMarker}
                    onClick={openHistory}
                    aria-label="This run has moderation history — view history"
                    title="Has moderation history — view history"
                >
                    <ClockHistory size={14} aria-hidden />
                </button>
            )}
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
                                Verify run
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
                                <>
                                    <Dropdown.Item
                                        as="button"
                                        type="button"
                                        className={styles.item}
                                        onClick={() => openModDialog('runner')}
                                    >
                                        Runner…
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        as={Link}
                                        className={styles.item}
                                        href={`/games-v2/${encodeURIComponent(gameSlug)}/manage/moderation/runner/${entry.userId}?from=board`}
                                    >
                                        View runner page
                                    </Dropdown.Item>
                                </>
                            )}
                            {/* Anonymize (design doc §C). Offered for every
                                row, including already-anonymized ones — a
                                run-scoped mask can still be widened to the
                                whole runner, and the dialog explains which
                                scopes need an account. */}
                            <Dropdown.Item
                                as="button"
                                type="button"
                                className={styles.item}
                                onClick={() => openModDialog('hide-identity')}
                            >
                                Hide identity…
                            </Dropdown.Item>
                            <Dropdown.Item
                                as="button"
                                type="button"
                                className={styles.item}
                                onClick={markForLater}
                            >
                                Mark for later
                            </Dropdown.Item>
                            {onSelectRunner && (
                                <Dropdown.Item
                                    as="button"
                                    type="button"
                                    className={styles.item}
                                    onClick={onSelectRunner}
                                >
                                    Select all runs by {entry.runnerName}
                                </Dropdown.Item>
                            )}
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
                    <HideIdentityDialog
                        open={modDialog === 'hide-identity'}
                        onClose={() => setModDialog(null)}
                        onDone={onModMutated}
                        gameSlug={gameSlug}
                        gameDisplay={modCtx.gameDisplay}
                        runnerName={entry.runnerName}
                        runId={runId}
                        userId={entry.userId ?? null}
                        categoryId={modCategory.id}
                        categoryDisplay={modCategory.display}
                        subcategoryKey={entrySubcategoryKey}
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
                            dossierFrom="board"
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

/**
 * Mod kebab for a manual (set) time row. Mirrors the run kebab's verb set
 * where a manual-time equivalent exists: Verify/Reject (verdict endpoint),
 * Remove (delete — a manual time has no exclude machinery), Change time
 * (edit timeMs/evidence via ManualTimeDialog), plus the runner links.
 * Move/Mark/Hide-identity/history are run-only and deliberately absent.
 */
function ManualRowActionsMenu({
    entry,
    manualTimeId,
    gameSlug,
    categorySlug,
    subcategoryKey,
}: {
    entry: LeaderboardEntry;
    manualTimeId: number;
    gameSlug: string;
    categorySlug: string;
    subcategoryKey: string;
}) {
    const router = useRouter();
    const [modVerb, setModVerb] = useState<ModVerb | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [modCtx, setModCtx] = useState<ModBoardContext | null>(null);
    const [_ctxPending, startCtxLoad] = useTransition();

    const modCategory =
        modCtx?.categories.find((c) => c.name === categorySlug) ?? null;

    const openEdit = () => {
        if (modCtx != null) {
            if (modCategory == null) {
                toast.error("Could not resolve this board's category.");
                return;
            }
            setEditOpen(true);
            return;
        }
        startCtxLoad(async () => {
            const res = await loadModBoardContextAction(gameSlug);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            const ctx = {
                gameDisplay: res.gameDisplay,
                categories: res.categories,
                variables: res.variables,
            };
            setModCtx(ctx);
            if (!ctx.categories.some((c) => c.name === categorySlug)) {
                toast.error("Could not resolve this board's category.");
                return;
            }
            setEditOpen(true);
        });
    };

    const onMutated = () => {
        setModVerb(null);
        setEditOpen(false);
        router.refresh();
    };

    // The entry carries the time in whichever clock the manual time
    // asserted — exactly one of gameTime/realTime is set for manual rows.
    const timing = entry.gameTime != null ? 'gametime' : 'realtime';
    const timeMs = entry.gameTime ?? entry.realTime ?? entry.time ?? 0;

    return (
        <>
            <Dropdown align="end">
                <Dropdown.Toggle
                    as="button"
                    type="button"
                    id={`manual-actions-${manualTimeId}`}
                    className={styles.toggle}
                    aria-label="Set-time actions"
                    title="Set-time actions"
                >
                    <ThreeDotsVertical aria-hidden size={16} />
                </Dropdown.Toggle>
                <Dropdown.Menu
                    className={styles.menu}
                    // Same fixed/non-adaptive popper as the run kebab — see
                    // the comment there for why.
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
                        as={Link}
                        className={styles.item}
                        href={`/games-v2/${encodeURIComponent(gameSlug)}/manual/${manualTimeId}`}
                    >
                        View set time
                    </Dropdown.Item>
                    <Dropdown.Divider className={styles.menuDivider} />
                    <Dropdown.Header className={styles.menuHeader}>
                        Moderator
                    </Dropdown.Header>
                    {entry.verificationStatus !== 'verified' && (
                        <Dropdown.Item
                            as="button"
                            type="button"
                            className={styles.item}
                            onClick={() => setModVerb('approve')}
                        >
                            Verify set time
                        </Dropdown.Item>
                    )}
                    {entry.verificationStatus !== 'rejected' && (
                        <Dropdown.Item
                            as="button"
                            type="button"
                            className={styles.item}
                            onClick={() => setModVerb('reject')}
                        >
                            Reject set time
                        </Dropdown.Item>
                    )}
                    <Dropdown.Item
                        as="button"
                        type="button"
                        className={styles.item}
                        onClick={openEdit}
                    >
                        Change time…
                    </Dropdown.Item>
                    <Dropdown.Item
                        as="button"
                        type="button"
                        className={`${styles.item} ${styles.danger}`}
                        onClick={() => setModVerb('remove')}
                    >
                        Remove set time…
                    </Dropdown.Item>
                    {entry.userId != null && (
                        <Dropdown.Item
                            as={Link}
                            className={styles.item}
                            href={`/games-v2/${encodeURIComponent(gameSlug)}/manage/moderation/runner/${entry.userId}?from=board`}
                        >
                            View runner page
                        </Dropdown.Item>
                    )}
                </Dropdown.Menu>
            </Dropdown>

            {modVerb && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb={modVerb}
                    target={{
                        kind: 'runs',
                        runIds: [],
                        manualTimeIds: [manualTimeId],
                        label: `${entry.runnerName}'s set time`,
                    }}
                    onDone={onMutated}
                    onClose={() => setModVerb(null)}
                />
            )}

            {editOpen && modCategory != null && (
                <ManualTimeDialog
                    gameSlug={gameSlug}
                    runnerRef={
                        entry.userId != null
                            ? { userId: entry.userId }
                            : { guestName: entry.runnerName }
                    }
                    runnerLabel={entry.runnerName}
                    categoryId={modCategory.id}
                    categoryLabel={modCategory.display}
                    subcategoryKey={subcategoryKey}
                    existing={{
                        id: manualTimeId,
                        timing,
                        timeMs,
                        evidenceUrl: entry.vodUrl ?? null,
                    }}
                    onDone={onMutated}
                    onClose={() => setEditOpen(false)}
                />
            )}
        </>
    );
}
