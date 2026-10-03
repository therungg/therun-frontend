'use client';

import { type ReactNode, useState } from 'react';
import { toast } from 'react-toastify';
import type { LeaderboardEntry } from '../../../../../../../types/leaderboards.types';
import type { RejectionReasonKey } from '../../../../../../../types/moderation.types';
import { RunnerAvatar } from '../../../leaderboard/runner-avatar';
import { UNDO_VERIFY_REASON } from '../shared/action-model';
import { applyVerdictsAction } from '../shared/actions/verdicts.action';
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
              notPending: entries.length - counts.decline,
              notApproved: entries.length - sel.approvedRunIds.length,
              alreadyRemoved: sel.removedIds.length,
              notOnBoard: sel.loaded
                  ? sel.approvedRunIds.length -
                    sel.onBoardIds.length -
                    sel.removedIds.length
                  : 0,
              alreadyThere: sel.runs.length - movable.length,
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

    /** Toast and refresh once something applied; undo only where it reverses all of it. */
    const done = (
        message: string,
        undo: (() => Promise<UndoResult>) | null,
    ) => {
        if (undo) fireUndoToast(message, undo, afterMutation);
        else toast.success(message);
        afterMutation();
    };

    // Nobody verifies their own run: those are left out of the call, and
    // the backend skips any it knows is the viewer's that the row does not
    // show (a run they typed in). Both are counted in the toast.
    const runApprove = async () => {
        const runIds = sel.verifiableRunIds;
        let verified = 0;
        let skippedOwn = sel.ownPendingCount;
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
                verified = res.result.affectedRunCount;
                skippedOwn += res.result.skippedOwn ?? 0;
            }
            const skipped =
                skippedOwn > 0 ? ` · ${skippedOwn} of yours skipped` : '';
            if (verified === 0) {
                toast.info(
                    skippedOwn > 0
                        ? "You can't verify your own run."
                        : 'Nothing to verify.',
                );
                afterMutation();
                return;
            }
            done(
                `${VERB_LABEL.approve}: ${plural(verified, 'run')}${skipped}`,
                () =>
                    unwrap(
                        applyVerdictsAction(
                            gameSlug,
                            'unverify',
                            runIds,
                            UNDO_VERIFY_REASON,
                        ),
                    ),
            );
        } catch {
            toast.error('Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    };

    const runRestore = async () => {
        const runs = {
            removed: sel.removedIds,
            declined: sel.declinedRunIds,
        };
        const count = runs.removed.length + runs.declined.length;
        setBusy(true);
        try {
            const res = await restoreRuns(gameSlug, runs, LIGHT_REASON.restore);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            done(`${VERB_LABEL.restore}: ${plural(count, 'run')}`, res.undo);
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
                message = `${VERB_LABEL.decline}: ${plural(counts.decline, 'run')}`;
            } else if (verb === 'remove') {
                // Only runs still on the board: undo must not restore runs
                // someone else removed earlier.
                if (sel.onBoardIds.length) {
                    runRes = await removeRuns(gameSlug, sel.onBoardIds, reason);
                }
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
                message = `${VERB_LABEL.move}: ${plural(movable.length, 'run')} to ${move.toName}`;
            }
            // Errors keep the form open and usable.
            if (runRes && 'error' in runRes) {
                toast.error(runRes.error);
                // Move goes run by run: some may have moved.
                if (verb === 'move') afterMutation();
                return;
            }
            onFormBack(null);
            setDraft(null);
            done(message, runRes ? runRes.undo : null);
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
                Verify and Reject act on the <b>{counts.approve} pending</b>{' '}
                {runWord(counts.approve)}.
            </span>,
        );
    }
    if (sel.loaded && counts.remove > 0) {
        notes.push(
            <span key="remove">
                Remove acts on the <b>{counts.remove} verified</b>{' '}
                {runWord(counts.remove)}.
            </span>,
        );
    }
    if (sel.loaded && counts.restore > 0) {
        notes.push(
            <span key="restore">
                Restore acts on the <b>{counts.restore} rejected or removed</b>{' '}
                {runWord(counts.restore)}.
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
                    <span>verified</span>
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
