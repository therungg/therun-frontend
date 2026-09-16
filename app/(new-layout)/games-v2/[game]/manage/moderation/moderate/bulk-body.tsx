'use client';

import {
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { toast } from 'react-toastify';
import type { LeaderboardEntry } from '../../../../../../../types/leaderboards.types';
import type { RejectionReasonKey } from '../../../../../../../types/moderation.types';
import { RunnerAvatar } from '../../../leaderboard/runner-avatar';
import { isTriageInert } from '../attention/triage-keyboard';
import { UNDO_VERIFY_REASON } from '../shared/action-model';
import { previewExcludeAction } from '../shared/actions/exclude.action';
import { manualTimesBulkAction } from '../shared/actions/manual-times.action';
import {
    applyVerdictsAction,
    previewVerdictsAction,
} from '../shared/actions/verdicts.action';
import { REJECTION_REASONS } from '../shared/rejection-reasons';
import { fireUndoToast, type UndoResult } from '../shared/undo-toast';
import { subcategoryLabel } from '../worklist/worklist-model';
import {
    HeavyFormBody,
    HeavyFormFooter,
    type HeavyFormSpec,
    useHeavyForm,
} from './heavy-form';
import type {
    BusyHandler,
    FormBackHandler,
    PanelLayout,
} from './moderate-panel';
import styles from './moderate-panel.module.scss';
import { useMoveTarget } from './move-target';
import {
    type ConfirmResult,
    declineRuns,
    MIN_REASON,
    moveRuns,
    removeRuns,
    restoreRuns,
} from './run-heavy-verbs';
import { LIGHT_REASON, unwrap } from './run-verbs';
import type { SheetContext, SheetSubject } from './subject';
import { VerbBar } from './verb-bar';
import {
    BULK_BAR,
    bulkVerbs,
    type ModerateVerb,
    type RunVerbState,
    VERB_LABEL,
    type VerbAvailability,
    verbFromKey,
} from './verbs';

export interface BulkBodyProps {
    subject: Extract<SheetSubject, { kind: 'bulk' }>;
    context: SheetContext;
    onMutated: () => void;
    /** Shell contract: register Back while a form is open, null otherwise. */
    onFormBack: FormBackHandler;
    onBusyChange: BusyHandler;
    /** The shell's wrapper. The body builds a `PanelLayout` and returns `render(layout)`. */
    render: (layout: PanelLayout) => ReactNode;
}

type BulkVerb = 'approve' | 'decline' | 'remove' | 'restore' | 'move';
type HeavyBulkVerb = 'decline' | 'remove' | 'move';

/** Runner chips shown before the rest collapse into "+N". */
const MAX_CHIPS = 12;

const plural = (n: number, one: string, many = `${one}s`) =>
    `${n} ${n === 1 ? one : many}`;

class PreviewError extends Error {}

const isManual = (e: LeaderboardEntry) => e.source === 'manual';

/** What the mount-time previews say about the selected runs. */
interface SelectionPreview {
    /** Approved runs already off the board (excluded). */
    removedCount: number;
    /** Run ids that may be among the removed ones; restore is a no-op on the rest. */
    removedIds: Set<number>;
    /** Distinct boards the pending and approved runs sit on. */
    boards: Set<string>;
}

export function BulkBody({
    subject,
    context,
    onMutated,
    onFormBack,
    onBusyChange,
    render,
}: BulkBodyProps) {
    const { entries, board } = subject;
    const { gameSlug } = context;

    // ---- The selection, by what each verb acts on --------------------------------
    const runs = entries.filter(
        (e): e is LeaderboardEntry & { runId: number } =>
            !isManual(e) && e.runId != null,
    );
    const manuals = entries.filter(
        (e): e is LeaderboardEntry & { manualTimeId: number } =>
            isManual(e) && e.manualTimeId != null,
    );
    const idsOf = (list: { runId: number }[]) => list.map((e) => e.runId);
    const manualIdsOf = (list: { manualTimeId: number }[]) =>
        list.map((e) => e.manualTimeId);
    const pendingRunIds = idsOf(
        runs.filter((e) => e.verificationStatus === 'pending'),
    );
    const approvedRunIds = idsOf(
        runs.filter((e) => e.verificationStatus === 'verified'),
    );
    const declinedRunIds = idsOf(
        runs.filter((e) => e.verificationStatus === 'rejected'),
    );
    const pendingManualIds = manualIdsOf(
        manuals.filter((e) => e.verificationStatus === 'pending'),
    );
    const approvedManualIds = manualIdsOf(
        manuals.filter((e) => e.verificationStatus === 'verified'),
    );

    // ---- Reads ---------------------------------------------------------------------
    // Removed is not on the row: the exclude preview says how many approved
    // runs would still come off. Read again after every mutation.
    const [preview, setPreview] = useState<SelectionPreview | null>(null);
    const [reloadTick, setReloadTick] = useState(0);
    const loadSeq = useRef(0);
    const pendingSig = pendingRunIds.join(',');
    const approvedSig = approvedRunIds.join(',');

    useEffect(() => {
        const seq = ++loadSeq.current;
        const pending = pendingSig ? pendingSig.split(',').map(Number) : [];
        const approved = approvedSig ? approvedSig.split(',').map(Number) : [];
        const boardKey = (b: { categoryId: number; subcategoryKey: string }) =>
            `${b.categoryId}:${b.subcategoryKey}`;
        const load = async (): Promise<SelectionPreview> => {
            const [verdicts, excludes] = await Promise.all([
                pending.length
                    ? previewVerdictsAction(gameSlug, 'verify', pending)
                    : null,
                approved.length
                    ? previewExcludeAction(gameSlug, { runIds: approved })
                    : null,
            ]);
            if (verdicts && 'error' in verdicts) {
                throw new PreviewError(verdicts.error);
            }
            if (excludes && 'error' in excludes) {
                throw new PreviewError(excludes.error);
            }
            const boards = new Set<string>();
            for (const lb of verdicts?.preview.affectedLeaderboards ?? []) {
                boards.add(boardKey(lb));
            }
            for (const lb of excludes?.preview.affectedLeaderboards ?? []) {
                boards.add(boardKey(lb));
            }
            const onBoard = new Set(
                excludes?.preview.sampleRuns.map((r) => r.runId) ?? [],
            );
            const stillOn = excludes?.preview.affectedRunCount ?? 0;
            const removedCount = Math.max(0, approved.length - stillOn);
            return {
                removedCount,
                removedIds: new Set(
                    removedCount
                        ? approved.filter((id) => !onBoard.has(id))
                        : [],
                ),
                boards,
            };
        };
        load()
            .then((p) => {
                if (seq === loadSeq.current) setPreview(p);
            })
            .catch((e: unknown) => {
                if (seq !== loadSeq.current) return;
                toast.error(
                    e instanceof PreviewError
                        ? e.message
                        : 'Could not check the selection.',
                );
                // Without the read nothing counts as removed.
                setPreview({
                    removedCount: 0,
                    removedIds: new Set(),
                    boards: new Set(),
                });
            });
    }, [gameSlug, pendingSig, approvedSig, reloadTick]);

    const afterMutation = () => {
        onMutated();
        setReloadTick((t) => t + 1);
    };

    // ---- Counts and verb state ------------------------------------------------------
    const loaded = preview !== null;
    const removedCount = preview?.removedCount ?? 0;
    const pendingCount = pendingRunIds.length + pendingManualIds.length;
    const approvedCount =
        approvedRunIds.length - removedCount + approvedManualIds.length;
    const counts: Record<BulkVerb, number> = {
        approve: pendingCount,
        decline: pendingCount,
        remove: approvedCount,
        restore: declinedRunIds.length + removedCount,
        move: runs.length,
    };
    // Manual times sit on the subject's board.
    const boardsTouched = preview
        ? new Set([
              ...preview.boards,
              ...(manuals.length
                  ? [`${board.categoryId}:${board.subcategoryKey}`]
                  : []),
          ]).size
        : null;

    const states: RunVerbState[] = entries.map((e) => ({
        status: e.verificationStatus,
        excluded:
            e.runId != null && (preview?.removedIds.has(e.runId) ?? false),
        hasVideo: Boolean(e.vodUrl),
        isManual: isManual(e),
        marked: false,
        inScope: true,
    }));
    const availability: VerbAvailability[] = bulkVerbs(states).map((a) => {
        const verb = a.verb as BulkVerb;
        // Removed is unknown until the preview lands.
        if (
            !loaded &&
            approvedRunIds.length > 0 &&
            (verb === 'remove' ||
                (verb === 'restore' && declinedRunIds.length === 0))
        ) {
            return { verb: a.verb, enabled: false, reason: 'Loading' };
        }
        if (counts[verb] > 0) return { verb: a.verb, enabled: true };
        return a.enabled
            ? {
                  verb: a.verb,
                  enabled: false,
                  reason: 'Applies to none of the selected runs',
              }
            : a;
    });
    const isEnabled = (verb: ModerateVerb) =>
        availability.some((a) => a.verb === verb && a.enabled);
    const barCounts: Partial<Record<ModerateVerb, number>> = {};
    for (const a of availability) {
        if (a.enabled) barCounts[a.verb] = counts[a.verb as BulkVerb];
    }

    // ---- Busy ----------------------------------------------------------------------
    const [busy, setBusyState] = useState(false);
    const busyRef = useRef(false);
    const setBusy = useCallback(
        (b: boolean) => {
            busyRef.current = b;
            setBusyState(b);
            onBusyChange(b);
        },
        [onBusyChange],
    );
    useEffect(() => () => onBusyChange(false), [onBusyChange]);

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
    const move = useMoveTarget(board, context);
    const openerRef = useRef<ModerateVerb | null>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    const back = useCallback(() => {
        if (busyRef.current) return;
        setDraft(null);
    }, []);

    const formOpen = draft !== null;
    useEffect(() => {
        if (!formOpen) return;
        onFormBack(back);
        return () => onFormBack(null);
    }, [formOpen, onFormBack, back]);

    // After Back or a confirm, focus returns to the verb that opened the form.
    useEffect(() => {
        if (formOpen || !openerRef.current) return;
        const verb = openerRef.current;
        openerRef.current = null;
        footerRef.current
            ?.querySelector<HTMLElement>(`[data-verb="${verb}"]`)
            ?.focus();
    }, [formOpen]);

    const skipped = (verb: BulkVerb) => entries.length - counts[verb];

    const spec: HeavyFormSpec | null = (() => {
        if (!draft) return null;
        const base = { verb: draft, runnerName: 'Each runner' } as const;
        switch (draft) {
            case 'decline': {
                const n = counts.decline;
                const skip = skipped('decline');
                const manualN = pendingManualIds.length;
                return {
                    ...base,
                    whatChanges: `${plural(n, 'pending run')} never ${n === 1 ? 'goes' : 'go'} on ${boardName}.${skip ? ` ${plural(skip, 'run')} not pending, skipped.` : ''}`,
                    undoHint: manualN ? undefined : 'Restore from history',
                    notUndoable: manualN
                        ? 'manual times have no restore'
                        : null,
                    reasonKeys: true,
                    minReason: MIN_REASON,
                    actionLabel: `Decline ${plural(n, 'run')}`,
                    tone: 'danger',
                };
            }
            case 'remove': {
                const n = counts.remove;
                const skip = skipped('remove');
                const manualN = approvedManualIds.length;
                return {
                    ...base,
                    whatChanges: `${plural(n, 'approved run')} ${n === 1 ? 'comes' : 'come'} off ${boardName}.${manualN ? ` ${plural(manualN, 'manual time')} ${manualN === 1 ? 'is' : 'are'} deleted.` : ''}${skip ? ` ${plural(skip, 'run')} not on the board, skipped.` : ''}`,
                    // Remove is the quiet exclusion; only a deleted manual
                    // time reaches its runner.
                    told:
                        manualN === 0
                            ? null
                            : manualN === n
                              ? undefined
                              : 'is told only when their manual time is deleted, with this reason.',
                    undoHint: manualN ? undefined : 'Restore from history',
                    notUndoable: manualN
                        ? 'manual times have no restore'
                        : null,
                    reasonKeys: false,
                    minReason: MIN_REASON,
                    actionLabel: `Remove ${plural(n, 'run')}`,
                    tone: 'danger',
                };
            }
            case 'move': {
                const n = counts.move;
                const manualN = entries.length - n;
                const skip = manualN
                    ? ` ${plural(manualN, 'manual time')} skipped.`
                    : '';
                return {
                    ...base,
                    whatChanges: move.same
                        ? `${plural(n, 'run')} ${n === 1 ? 'is' : 'are'} on ${boardName}.${skip}`
                        : `${plural(n, 'run')} ${n === 1 ? 'moves' : 'move'} from ${boardName} to ${move.toName}.${skip}`,
                    undoHint: 'Move them back',
                    notUndoable: null,
                    reasonKeys: false,
                    minReason: MIN_REASON,
                    actionLabel: `Move ${plural(n, 'run')}`,
                    tone: 'primary',
                    blocked: move.same || !move.toName,
                    fields: move.fields(busy),
                };
            }
        }
    })();
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
        const runIds = pendingRunIds;
        const manualIds = pendingManualIds;
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
        const ids = [...declinedRunIds, ...(preview?.removedIds ?? [])];
        setBusy(true);
        try {
            const res = await restoreRuns(gameSlug, ids, LIGHT_REASON.restore);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            done(
                `${VERB_LABEL.restore}: ${plural(counts.restore, 'run')}`,
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
            let n = 0;
            let message = '';
            if (verb === 'decline') {
                n = counts.decline;
                if (pendingRunIds.length) {
                    runRes = await declineRuns(
                        gameSlug,
                        pendingRunIds,
                        reason,
                        reasonKey,
                    );
                }
                manualIds = pendingManualIds;
                // A manual verdict needs written words; a key alone sends its label.
                manualReason =
                    reason.length >= MIN_REASON
                        ? reason
                        : (REJECTION_REASONS.find((r) => r.key === reasonKey)
                              ?.label ?? '');
                message = `${VERB_LABEL.decline}: ${plural(n, 'run')}`;
            } else if (verb === 'remove') {
                n = counts.remove;
                if (approvedRunIds.length) {
                    runRes = await removeRuns(gameSlug, approvedRunIds, reason);
                }
                manualIds = approvedManualIds;
                manualOp = 'delete';
                message = `${VERB_LABEL.remove}: ${plural(n, 'run')}`;
            } else {
                const target = move.target;
                if (!target) {
                    toast.error('Pick a board first.');
                    return;
                }
                n = counts.move;
                runRes = await moveRuns(
                    gameSlug,
                    runs.map((e) => ({
                        runId: e.runId,
                        runnerName: e.runnerName,
                        subcategoryKey: board.subcategoryKey,
                    })),
                    board.categoryId,
                    target,
                    reason,
                );
                message = `Moved: ${plural(n, 'run')} to ${move.toName}`;
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

    // ---- Keys --------------------------------------------------------------------------
    const handleRef = useRef(handle);
    const formOpenRef = useRef(formOpen);
    useEffect(() => {
        handleRef.current = handle;
        formOpenRef.current = formOpen;
    });
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.repeat) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const active = document.activeElement as HTMLElement | null;
            if (
                isTriageInert({
                    activeTag: active?.tagName ?? null,
                    isContentEditable: active?.isContentEditable ?? false,
                    dialogOpen: formOpenRef.current || busyRef.current,
                })
            )
                return;
            // Inline on a page, keys act only while focus is in the panel.
            const panel = rootRef.current?.closest('[data-mount]');
            if (
                panel?.getAttribute('data-mount') !== 'modal' &&
                !panel?.contains(active)
            )
                return;
            const verb = verbFromKey(e.key);
            if (!verb) return;
            e.preventDefault();
            handleRef.current(verb);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

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
    if (loaded && counts.remove > 0) {
        notes.push(
            <span key="remove">
                Remove acts on the <b>{counts.remove} approved</b>{' '}
                {runWord(counts.remove)}.
            </span>,
        );
    }
    if (loaded && counts.restore > 0) {
        notes.push(
            <span key="restore">
                Restore acts on the <b>{counts.restore} declined or removed</b>{' '}
                {runWord(counts.restore)}.
            </span>,
        );
    }
    if (manuals.length > 0 && runs.length > 0) {
        notes.push(
            <span key="move">
                Move skips the <b>{plural(manuals.length, 'manual time')}</b>.
            </span>,
        );
    }

    const summary = (
        <div className={styles.bulkSect}>
            <div className={styles.affected}>
                <div>
                    <b>{pendingCount}</b>
                    <span>pending</span>
                </div>
                <div>
                    <b>{loaded ? approvedCount : '…'}</b>
                    <span>approved</span>
                </div>
                <div>
                    <b>{boardsTouched ?? '…'}</b>
                    <span>
                        {boardsTouched === 1
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
