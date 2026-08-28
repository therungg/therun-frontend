'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Form, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
    appealRunAction,
    reportRunAction,
    selfMoveRunAction,
} from '~src/actions/run-user-actions.action';
import Link from '~src/components/link';
import { buildSubmitHref } from '~src/lib/board-url';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import type { LeaderboardRosterRow } from '../../../../../types/moderation.types';
import { loadOwnerBoardContextAction } from '../leaderboard/actions/load-owner-board-context.action';
import { MoveDialog } from '../manage/boards/move-dialog';
import { isSameRunner } from '../shared/is-same-runner';
import { OwnerHideIdentityDialog } from '../shared/owner-hide-identity-dialog';
import {
    SelfRunVerdictDialog,
    useSelfRunVerdict,
} from '../shared/self-run-verdict';
import type { RunViewModel } from './run-view';

// The default action-button style on this surface. Extracted so the run-page
// mod buttons stay visually in lockstep — one edit restyles the whole row.
const BTN_SECONDARY = 'btn btn-sm btn-outline-secondary';

type ModalKind = 'report' | 'appeal' | null;
// Hide-identity is deliberately NOT in here: its dialog has its own `open`
// state so nothing else can close it. See the render guard at the bottom.
type OwnerDialogKind = 'move' | null;

interface MoveContext {
    categories: ResolvedCategory[];
    variables: VariableRow[];
}

export function RunActions({
    model,
    sessionUsername,
}: {
    model: RunViewModel;
    sessionUsername: string | null;
}) {
    const router = useRouter();
    const [modal, setModal] = useState<ModalKind>(null);
    const [reason, setReason] = useState('');
    const [pending, startTransition] = useTransition();
    const selfVerdict = useSelfRunVerdict();
    // Report and Appeal are mutually exclusive (one `reason` textarea, one open
    // at a time), so a single ref focused on Modal enter covers both. Bootstrap's
    // own autoFocus lands on the header close button, not the field the user
    // must fill — onEntered fires after the enter transition, when focus sticks.
    const reasonRef = useRef<HTMLTextAreaElement>(null);
    const focusReason = () => reasonRef.current?.focus();

    const isRun = model.kind === 'run';
    const isOwnRun = isRun && isSameRunner(sessionUsername, model.runnerName);
    const canReport = isRun && sessionUsername != null;
    // Same standard the board's owner-mode gate uses (leaderboard-pager.tsx's
    // isOwnEntry): a guest submission or a userId-less row has no `/v1/me/*`
    // identity to act as. RunViewModel carries no `anonymized` flag (unlike
    // LeaderboardEntry), so that third board-gate condition can't be checked
    // here — not modelled as a gap in the guard, just a fact this page's
    // model doesn't expose.
    //
    // ONE gate for the whole row. Appeal / Hide / Restore are `/v1/me/*` calls
    // exactly like Move and Hide-identity, so a name-only check would render
    // buttons that 403 and let one button row disagree with the next about
    // what the visitor owns.
    const canOwnerModerate = isOwnRun && model.userId != null && !model.isGuest;
    const canAppeal =
        canOwnerModerate && model.verificationStatus === 'rejected';
    const canHide = canOwnerModerate && model.verificationStatus !== 'rejected';
    const canRestore =
        canOwnerModerate && model.verificationStatus === 'rejected';
    // Move only makes sense for a run that's actually on a board — a
    // rejected/hidden run has nowhere to move from, matching `canHide`'s own
    // status branch below rather than opening a dialog for a run this page's
    // quick verbs already treat as off-board.
    const canMove = canOwnerModerate && model.verificationStatus !== 'rejected';

    const [ownerDialog, setOwnerDialog] = useState<OwnerDialogKind>(null);
    // Tracked separately from `ownerDialog` so the hide-identity dialog's
    // lifetime is owned by the runner (open → close), not by any gate its own
    // success can change. See the render guard below.
    const [hideIdentityOpen, setHideIdentityOpen] = useState(false);
    // Move's category picker needs the game's board context (categories +
    // variable defs) — loaded lazily on first click, same pattern as the
    // board drawer's mod dialogs (run-inspector.tsx), so a run page view
    // that never opens Move never pays for it.
    const [moveCtx, setMoveCtx] = useState<MoveContext | null>(null);
    const [ctxPending, startCtxLoad] = useTransition();

    const moveCategory =
        moveCtx?.categories.find((c) => c.id === model.categoryId) ?? null;

    const openMove = () => {
        if (moveCtx != null) {
            // Cached from an earlier click. If the run's own category never
            // resolved (see below), it never will from this same cache —
            // say so every time rather than silently doing nothing, same
            // shape as run-inspector.tsx's openModDialog.
            if (moveCategory == null) {
                toast.error("Could not resolve this run's category.");
                return;
            }
            setOwnerDialog('move');
            return;
        }
        startCtxLoad(async () => {
            const res = await loadOwnerBoardContextAction(
                model.game.name,
                model.categoryId,
            );
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            const categories = res.categories;
            setMoveCtx({ categories, variables: res.variables });
            // resolveCategory drops low-activity categories outright (not
            // just archived/non-featured ones) — a run sitting in one of
            // those has no ResolvedCategory to find here at all. Without
            // this check the guarded MoveDialog render below would mount
            // nothing and every later click would hit the cached branch
            // above forever, with no feedback that Move is unusable for
            // this run.
            if (!categories.some((c) => c.id === model.categoryId)) {
                toast.error("Could not resolve this run's category.");
                return;
            }
            setOwnerDialog('move');
        });
    };

    // Minimal LeaderboardRosterRow — MoveDialog only reads `runnerName` (its
    // title) and `runId` in the moderator path; the owner path submits
    // through `onSubmitOwner` below and never touches `row.runId`.
    const moveRow: LeaderboardRosterRow = {
        runId: model.id,
        userId: model.userId,
        runnerName: model.runnerName,
        subcategoryKey: model.subcategoryKey,
        time: model.realTime,
        gameTime: model.gameTime,
        verificationStatus: model.verificationStatus,
        vodUrl: model.vodUrl,
        endedAt: model.runDate ?? '',
        isLeaderboardEntry: true,
        isLeaderboardEntryGt: true,
    };
    // RunViewModel carries no category slug of its own (only
    // categoryDisplay), but a matched board standing (requirement 1's
    // getUserRankingsByName lookup, `run` kind only) does — use it when
    // present rather than guessing at the category from display text;
    // falls back to the game's default board otherwise.
    const correctHref = buildSubmitHref(model.game.name, {
        categorySlug: model.boardStanding?.categorySlug,
        subcategoryKey: model.boardStanding?.subcategoryKey,
    });

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

    const copyLink = async () => {
        const url = window.location.href;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                // navigator.clipboard is undefined in non-secure contexts;
                // fall back to the legacy execCommand path.
                const textarea = document.createElement('textarea');
                textarea.value = url;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(textarea);
                if (!ok) throw new Error('execCommand copy failed');
            }
            toast.success('Link copied to clipboard.');
        } catch {
            toast.error('Could not copy link.');
        }
    };

    return (
        <>
            <div className="d-flex flex-wrap gap-2">
                <button
                    type="button"
                    className={BTN_SECONDARY}
                    onClick={copyLink}
                >
                    Copy link
                </button>
                {canReport && (
                    <button
                        type="button"
                        className={BTN_SECONDARY}
                        onClick={() => setModal('report')}
                    >
                        Report run
                    </button>
                )}
                {canAppeal && (
                    <button
                        type="button"
                        className={BTN_SECONDARY}
                        onClick={() => setModal('appeal')}
                    >
                        Appeal rejection
                    </button>
                )}
                {isOwnRun && (
                    <Link href={correctHref} className={BTN_SECONDARY}>
                        Correct this time…
                    </Link>
                )}
                {canMove && (
                    <button
                        type="button"
                        className={BTN_SECONDARY}
                        onClick={openMove}
                        disabled={ctxPending}
                    >
                        {ctxPending ? 'Loading…' : 'Move my run…'}
                    </button>
                )}
                {canOwnerModerate && (
                    <button
                        type="button"
                        className={BTN_SECONDARY}
                        onClick={() => setHideIdentityOpen(true)}
                    >
                        Hide my identity…
                    </button>
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
                        className={BTN_SECONDARY}
                        onClick={() =>
                            selfVerdict.requestVerdict(model.id, 'unreject')
                        }
                    >
                        Restore my run
                    </button>
                )}
            </div>

            <Modal
                show={modal === 'report'}
                onHide={close}
                onEntered={focusReason}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title className="h6">Report this run</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="small text-muted">
                        Tell the moderators why this run looks wrong (fake time,
                        spliced video, wrong category…). Minimum 10 characters.
                    </p>
                    <Form.Control
                        ref={reasonRef}
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
                        className={BTN_SECONDARY}
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

            <Modal
                show={modal === 'appeal'}
                onHide={close}
                onEntered={focusReason}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title className="h6">Appeal rejection</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="small text-muted">
                        Explain why this run should be reinstated. A moderator
                        will review your appeal. Minimum 10 characters.
                    </p>
                    <Form.Control
                        ref={reasonRef}
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
                        className={BTN_SECONDARY}
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

            {moveCtx != null && moveCategory != null && (
                <MoveDialog
                    open={ownerDialog === 'move'}
                    onClose={() => setOwnerDialog(null)}
                    row={moveRow}
                    category={moveCategory}
                    categories={moveCtx.categories}
                    variables={moveCtx.variables}
                    subcategoryKey={model.subcategoryKey}
                    gameSlug={model.game.name}
                    onMutated={() => router.refresh()}
                    ownerMode
                    onSubmitOwner={(target) =>
                        selfMoveRunAction(
                            model.game.name,
                            model.gameId,
                            model.id,
                            {
                                // The run's OWN category, which is not
                                // necessarily the board it currently sits on:
                                // a previous move writes `run_board_overrides`
                                // and leaves `finished_runs.category_id`
                                // alone, and the run-detail payload reports
                                // the latter. RunViewModel therefore cannot
                                // name the effective board, so a re-move of an
                                // already-moved run busts the original
                                // category's cache instead of the override's.
                                // Bounded: the target side is always busted,
                                // and the stale origin board self-heals on the
                                // `minutes` cacheLife. Closing it needs the
                                // run-detail response to expose the effective
                                // board (a backend change, not one this
                                // component can make).
                                categoryId: model.categoryId,
                                subcategoryKey: model.subcategoryKey,
                            },
                            target,
                        )
                    }
                />
            )}
            {/* Mounted on "was opened", never on `canOwnerModerate`: the
                dialog's own success can flip that gate (hiding your identity
                redacts this page's payload for anyone the backend doesn't
                exempt) and a gate-keyed guard would then tear the dialog off
                screen mid-flight, before the runner ever sees the result.
                Same reason the board pager mounts its copy on open. */}
            {hideIdentityOpen && (
                <OwnerHideIdentityDialog
                    open
                    onClose={() => setHideIdentityOpen(false)}
                    // Refreshes the page's server data (the run's own name may
                    // now be a placeholder for everyone else) without touching
                    // the dialog: it stays mounted and keeps showing what
                    // actually happened until the runner closes it.
                    onDone={() => router.refresh()}
                    gameId={model.gameId}
                    gameSlug={model.game.name}
                    gameDisplay={model.game.display}
                />
            )}
        </>
    );
}
