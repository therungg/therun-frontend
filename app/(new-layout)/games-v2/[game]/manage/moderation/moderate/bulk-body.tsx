'use client';

import { type ReactNode, useState } from 'react';
import { toast } from 'react-toastify';
import type { LeaderboardEntry } from '../../../../../../../types/leaderboards.types';
import type { RejectionReasonKey } from '../../../../../../../types/moderation.types';
import { RunnerAvatar } from '../../../leaderboard/runner-avatar';
import { UNDO_VERIFY_REASON } from '../shared/action-model';
import { manualTimesBulkAction } from '../shared/actions/manual-times.action';
import { applyVerdictsAction } from '../shared/actions/verdicts.action';
import { REJECTION_REASONS } from '../shared/rejection-reasons';
import { fireUndoToast, type UndoResult } from '../shared/undo-toast';
import { subcategoryLabel } from '../worklist/worklist-model';
import { HeavyFormBody, HeavyFormFooter, useHeavyForm } from './heavy-form';
import type {
    BusyHandler,
    FormBackHandler,
    PanelLayout,
} from './moderate-panel';
import styles from './moderate-panel.module.scss';
import { useMoveTarget } from './move-target';
import { useInitialVerb, usePanelVerbKeys, usePanelVerbs } from './panel-verbs';
import {
    bulkHeavySpec,
    type ConfirmResult,
    declineRuns,
    type HeavyBulkVerb,
    MIN_REASON,
    moveRuns,
    removeRuns,
    restoreRuns,
} from './run-heavy-verbs';
import { LIGHT_REASON, unwrap } from './run-verbs';
import type { SheetContext, SheetSubject } from './subject';
import { type BulkVerb, useBulkSelection } from './use-bulk-selection';
import { VerbBar } from './verb-bar';
import { BULK_BAR, type ModerateVerb, VERB_LABEL } from './verbs';

export interface BulkBodyProps {
    subject: Extract<SheetSubject, { kind: 'bulk' }>;
    context: SheetContext;
    onMutated: () => void;
    /** Shell contract: register Back while a form is open, null otherwise. */
    onFormBack: FormBackHandler;
    onBusyChange: BusyHandler;
    /** The shell's wrapper. The body builds a `PanelLayout` and returns `render(layout)`. */
    render: (layout: PanelLayout) => ReactNode;
    /** Acted on once when the selection has loaded; ignored if it does not apply. */
    initialVerb?: ModerateVerb;
    onInitialVerbUsed: () => void;
}

/** Runner chips shown before the rest collapse into "+N". */
const MAX_CHIPS = 12;

const plural = (n: number, one: string, many = `${one}s`) =>
    `${n} ${n === 1 ? one : many}`;

export function BulkBody({
    subject,
    context,
    onMutated,
    onFormBack,
    onBusyChange,
    render,
    initialVerb,
    onInitialVerbUsed,
}: BulkBodyProps) {
    const { entries, board } = subject;
    const { gameSlug } = context;
    const sel = useBulkSelection(entries, gameSlug, board, context.variables);
    const { counts, availability } = sel;

    const afterMutation = () => {
        onMutated();
        sel.reload();
    };

    const isEnabled = (verb: ModerateVerb) =>
        availability.some((a) => a.verb === verb && a.enabled);
    const barCounts: Partial<Record<ModerateVerb, number>> = {};
    for (const a of availability) {
        if (a.enabled) barCounts[a.verb] = counts[a.verb as BulkVerb];
    }

    // ---- Board words ---------------------------------------------------------------
    const sub = subcategoryLabel(
        { categoryId: board.categoryId, subcategoryKey: board.subcategoryKey },
        context.variables,
    );
    const boardName = sub
        ? `${board.categoryDisplay} · ${sub}`
        : board.categoryDisplay;

    // ---- Heavy form ------------------------------------------------------------------
    const [draft, setDraft] = useState<HeavyBulkVerb | null>(null);
    const formOpen = draft !== null;
    const { busy, busyRef, setBusy, back, openerRef, footerRef, rootRef } =
        usePanelVerbs({
            formOpen,
            closeForm: () => setDraft(null),
            onFormBack,
            onBusyChange,
        });
    const move = useMoveTarget(board, context);

    // Move skips runs already on the picked board.
    const picked = move.picked;
    const movable = picked
        ? sel.runs.filter(
              (r) =>
                  board.categoryId !== picked.categoryId ||
                  r.subcategoryKey !== picked.subcategoryKey,
          )
        : [];

    const spec = draft
        ? bulkHeavySpec(draft, {
              boardName,
              count: draft === 'move' ? movable.length : counts[draft],
              manualCount:
                  draft === 'decline'
                      ? sel.pendingManualIds.length
                      : draft === 'remove'
                        ? sel.approvedManualIds.length
                        : 0,
              notPending: entries.length - counts.decline,
              notApproved:
                  entries.length - counts.remove - sel.removedIds.length,
              alreadyRemoved: sel.removedIds.length,
              alreadyThere: sel.runs.length - movable.length,
              manualSkipped: entries.length - sel.runs.length,
              moveToName: move.toName,
              noTarget: picked === null,
              fields: draft === 'move' ? move.fields(busy) : undefined,
          })
        : null;
    const formState = useHeavyForm(spec);

    // ---- Verbs ------------------------------------------------------------------------
    const openForm = (verb: HeavyBulkVerb) => {
        move.reset();
        openerRef.current = verb;
        setDraft(verb);
    };

    /** Manual times ride along through their own bulk call. */
    const applyManual = async (
        ids: number[],
        op: 'verify' | 'reject' | 'delete',
        reason: string,
    ): Promise<{ error: string } | { ok: true }> => {
        if (ids.length === 0) return { ok: true };
        const res = await manualTimesBulkAction(gameSlug, ids, op, reason);
        if ('error' in res) return res;
        if (res.failed > 0) {
            return {
                error: `${plural(res.failed, 'manual time')} failed. Try again.`,
            };
        }
        return { ok: true };
    };

    /** Toast and refresh once something applied; undo only where it reverses all of it. */
    const done = (
        message: string,
        undo: (() => Promise<UndoResult>) | null,
    ) => {
        if (undo) fireUndoToast(message, undo, afterMutation);
        else toast.success(message);
        afterMutation();
    };

    const runApprove = async () => {
        const runIds = sel.pendingRunIds;
        const manualIds = sel.pendingManualIds;
        setBusy(true);
        try {
            if (runIds.length) {
                const res = await applyVerdictsAction(
                    gameSlug,
                    'verify',
                    runIds,
                    LIGHT_REASON.approve,
                );
                if ('error' in res) {
                    toast.error(res.error);
                    return;
                }
            }
            const manual = await applyManual(
                manualIds,
                'verify',
                LIGHT_REASON.approve,
            );
            if ('error' in manual) {
                toast.error(manual.error);
                if (runIds.length) afterMutation();
                return;
            }
            // A manual verdict has no unverify: undo only when every
            // approved entry was a run.
            done(
                `${VERB_LABEL.approve}: ${plural(runIds.length + manualIds.length, 'run')}`,
                runIds.length && !manualIds.length
                    ? () =>
                          unwrap(
                              applyVerdictsAction(
                                  gameSlug,
                                  'unverify',
                                  runIds,
                                  UNDO_VERIFY_REASON,
                              ),
                          )
                    : null,
            );
        } catch {
            toast.error('Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    };

    const runRestore = async () => {
        const ids = [...sel.declinedRunIds, ...sel.removedIds];
        setBusy(true);
        try {
            const res = await restoreRuns(gameSlug, ids, LIGHT_REASON.restore);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            done(
                `${VERB_LABEL.restore}: ${plural(ids.length, 'run')}`,
                res.undo,
            );
        } catch {
            toast.error('Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    };

    const handle = (verb: ModerateVerb) => {
        if (busyRef.current || draft !== null || !isEnabled(verb)) return;
        switch (verb) {
            case 'approve':
                void runApprove();
                return;
            case 'restore':
                void runRestore();
                return;
            case 'decline':
            case 'remove':
            case 'move':
                openForm(verb);
                return;
            default:
                return;
        }
    };

    const confirm = async (
        reason: string,
        reasonKey: RejectionReasonKey | null,
    ) => {
        if (!draft || busyRef.current) return;
        const verb = draft;
        setBusy(true);
        try {
            let runRes: ConfirmResult | null = null;
            let manualIds: number[] = [];
            let manualOp: 'reject' | 'delete' = 'reject';
            let manualReason = reason;
            let message = '';
            if (verb === 'decline') {
                if (sel.pendingRunIds.length) {
                    runRes = await declineRuns(
                        gameSlug,
                        sel.pendingRunIds,
                        reason,
                        reasonKey,
                    );
                }
                manualIds = sel.pendingManualIds;
                // A manual verdict needs written words; a key alone sends its label.
                manualReason =
                    reason.length >= MIN_REASON
                        ? reason
                        : (REJECTION_REASONS.find((r) => r.key === reasonKey)
                              ?.label ?? '');
                message = `${VERB_LABEL.decline}: ${plural(counts.decline, 'run')}`;
            } else if (verb === 'remove') {
                // Only runs still on the board: undo must not restore runs
                // someone else removed earlier.
                if (sel.onBoardIds.length) {
                    runRes = await removeRuns(gameSlug, sel.onBoardIds, reason);
                }
                manualIds = sel.approvedManualIds;
                manualOp = 'delete';
                message = `${VERB_LABEL.remove}: ${plural(counts.remove, 'run')}`;
            } else {
                if (!picked || movable.length === 0) {
                    toast.error('Pick a board first.');
                    return;
                }
                runRes = await moveRuns(
                    gameSlug,
                    movable,
                    board.categoryId,
                    picked,
                    reason,
                );
                message = `Moved: ${plural(movable.length, 'run')} to ${move.toName}`;
            }
            // Errors keep the form open and usable.
            if (runRes && 'error' in runRes) {
                toast.error(runRes.error);
                // Move goes run by run: some may have moved.
                if (verb === 'move') afterMutation();
                return;
            }
            const manual = await applyManual(manualIds, manualOp, manualReason);
            if ('error' in manual) {
                toast.error(manual.error);
                if (runRes) afterMutation();
                return;
            }
            onFormBack(null);
            setDraft(null);
            done(
                message,
                runRes && manualIds.length === 0 ? runRes.undo : null,
            );
        } catch {
            toast.error('Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    };

    usePanelVerbKeys({ handle, formOpen, busyRef, rootRef });
    useInitialVerb({
        verb: initialVerb,
        ready: sel.loaded,
        handle,
        onUsed: onInitialVerbUsed,
    });

    // ---- Layout ------------------------------------------------------------------------
    const runners = new Map<string, LeaderboardEntry>();
    for (const e of entries) {
        const k = e.userId != null ? `u:${e.userId}` : `g:${e.runnerName}`;
        if (!runners.has(k)) runners.set(k, e);
    }
    const chips = [...runners.entries()];

    const identity = (
        <div ref={rootRef} className={styles.bulkHead}>
            <div className={styles.who}>
                <span className={styles.bulkCount}>
                    {plural(entries.length, 'run')}
                </span>
                <span className={styles.where}>
                    on <b>{board.categoryDisplay}</b>
                    {sub ? ` · ${sub}` : ''}
                </span>
            </div>
            <div className={styles.chips}>
                {chips.slice(0, MAX_CHIPS).map(([k, e]) => (
                    <span key={k} className={styles.chip}>
                        <RunnerAvatar
                            name={e.runnerName}
                            picture={e.picture}
                            size="xs"
                            anonymous={e.anonymized}
                        />
                        {e.runnerName}
                    </span>
                ))}
                {chips.length > MAX_CHIPS ? (
                    <span className={styles.chip} data-more>
                        +{chips.length - MAX_CHIPS}
                    </span>
                ) : null}
            </div>
        </div>
    );

    const runWord = (n: number) => (n === 1 ? 'run' : 'runs');
    const notes: ReactNode[] = [];
    if (counts.approve > 0) {
        notes.push(
            <span key="pending">
                Approve and Decline act on the <b>{counts.approve} pending</b>{' '}
                {runWord(counts.approve)}.
            </span>,
        );
    }
    if (sel.loaded && counts.remove > 0) {
        notes.push(
            <span key="remove">
                Remove acts on the <b>{counts.remove} approved</b>{' '}
                {runWord(counts.remove)}.
            </span>,
        );
    }
    if (sel.loaded && counts.restore > 0) {
        notes.push(
            <span key="restore">
                Restore acts on the <b>{counts.restore} declined or removed</b>{' '}
                {runWord(counts.restore)}.
            </span>,
        );
    }
    if (sel.manuals.length > 0 && sel.runs.length > 0) {
        notes.push(
            <span key="move">
                Move skips the{' '}
                <b>{plural(sel.manuals.length, 'manual time')}</b>.
            </span>,
        );
    }

    const summary = (
        <div className={styles.bulkSect}>
            <div className={styles.affected}>
                <div>
                    <b>{counts.approve}</b>
                    <span>pending</span>
                </div>
                <div>
                    <b>{sel.approvedCount ?? '…'}</b>
                    <span>approved</span>
                </div>
                <div>
                    <b>{sel.boardsTouched ?? '…'}</b>
                    <span>
                        {sel.boardsTouched === 1
                            ? 'board touched'
                            : 'boards touched'}
                    </span>
                </div>
            </div>
            {notes.length ? (
                <p className={styles.splitNote}>
                    {notes.flatMap((n, i) => (i ? [' ', n] : [n]))}
                </p>
            ) : null}
        </div>
    );

    const layout: PanelLayout =
        spec && draft
            ? {
                  identity,
                  left: null,
                  right: (
                      <HeavyFormBody
                          key={draft}
                          spec={spec}
                          state={formState}
                          busy={busy}
                      />
                  ),
                  footer: (
                      <HeavyFormFooter
                          spec={spec}
                          state={formState}
                          busy={busy}
                          onBack={back}
                          onConfirm={(r, k) => void confirm(r, k)}
                      />
                  ),
                  pageLink: null,
              }
            : {
                  identity,
                  left: null,
                  right: summary,
                  footer: (
                      <div ref={footerRef} className={styles.contents}>
                          <VerbBar
                              bar={BULK_BAR}
                              more={[]}
                              availability={availability}
                              busy={busy}
                              onVerb={handle}
                              counts={barCounts}
                          />
                      </div>
                  ),
                  pageLink: null,
              };

    return render(layout);
}
