'use client';

import {
    type RefObject,
    useCallback,
    useEffect,
    useRef,
    useState,
    useTransition,
} from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    PreviewExcludeResult,
    UserEligibleRunRow,
    UserExclusionRuleInput,
    VerdictAction,
    VerdictPreviewResult,
} from '../../../../../../../types/moderation.types';
import { BoardDialog } from '../../../shared/board-dialog';
import { deleteRuleAction } from '../rules/actions/delete-rule.action';
import {
    type BanScope,
    hasTrueInverse,
    isBanUndoable,
    type ModVerb,
    REMOVE_REASONS,
    type RemoveReason,
    type RunActionTarget,
    removeReasonMeta,
    resolveRemoveMechanism,
    UNDO_VERIFY_REASON,
    undoReason,
} from './action-model';
import { loadUserEligibleRunsAction } from './actions/eligible-runs.action';
import { excludeAction, previewExcludeAction } from './actions/exclude.action';
import { manualTimesBulkAction } from './actions/manual-times.action';
import { restoreRunsAction } from './actions/restore.action';
import {
    applyVerdictsAction,
    previewVerdictsAction,
} from './actions/verdicts.action';
import styles from './run-action-dialog.module.scss';
import { fireUndoToast } from './undo-toast';

const MIN_REASON = 10;

/** An eligible run's time on the board's ranking clock. */
const runTime = (r: UserEligibleRunRow, timing: 'rt' | 'gt'): number | null =>
    timing === 'gt' ? r.gameTime : r.time;

// approve/restore are fast triage: Confirm doesn't wait on the preview
// round-trip — the affected-run summary streams into the body as
// supporting detail ("Loading preview…" while it's in flight), never
// blocking the action itself. remove/ban keep the gate: the
// affected-boards preview IS their safety mechanism before a harder-to-
// reverse action, so Confirm stays disabled until it resolves.
const PREVIEW_GATES_CONFIRM: Record<ModVerb, boolean> = {
    approve: false,
    unverify: false,
    restore: false,
    reject: true,
    remove: true,
    ban: true,
};

// approve/restore are fast triage — a note is optional and audit-logged, not
// gated. reject/remove/ban (and bulk variants, which reuse these same verbs)
// stay gated at MIN_REASON since they're consequential for the runner.
const REASON_REQUIRED: Record<ModVerb, boolean> = {
    approve: false,
    unverify: false,
    restore: false,
    reject: true,
    remove: true,
    ban: true,
};

// Sent when the moderator leaves the note blank on a verb where it's
// optional. The backend's verdict/exclude endpoints reject an empty reason
// (see src/lib/moderation/mod-fetch.ts's documented error, "reason is
// required (min 10 characters)"), so these stand in rather than sending "".
const DEFAULT_REASON: Partial<Record<ModVerb, string>> = {
    approve: 'Approved — no issues found.',
    unverify: 'Verification unset — back to pending.',
    restore: 'Restored after review.',
};

type PreviewState =
    | { kind: 'verdict'; data: VerdictPreviewResult }
    | { kind: 'exclude'; data: PreviewExcludeResult };

export const VERB_TITLE: Record<ModVerb, string> = {
    approve: 'Verify',
    unverify: 'Unverify',
    reject: 'Reject',
    remove: 'Remove',
    restore: 'Restore',
    ban: 'Ban runner',
};

export interface RunActionFormProps {
    gameSlug: string;
    verb: ModVerb;
    target: RunActionTarget;
    onDone: () => void;
    /** Cancel — dismisses the form without acting. */
    onClose: () => void;
    /** Initial ban scope for a `ban` verb (default 'category'). */
    defaultBanScope?: BanScope;
    /**
     * Called after a successful Undo mutation completes, instead of onDone.
     * Some panes' onDone removes the item from local list state (correct for
     * the original action, wrong for an undo — the item needs to reappear).
     * Falls back to onDone for panes where re-running it is already the
     * right "resync" behavior (a refetch or router.refresh()).
     */
    onUndoComplete?: () => void;
    /** External refs so a wrapping dialog can drive initial focus itself. */
    confirmRef?: RefObject<HTMLButtonElement | null>;
    reasonFieldRef?: RefObject<HTMLTextAreaElement | null>;
    /** Inline (non-dialog) hosts: focus the reason/Confirm on mount. */
    autoFocus?: boolean;
    /** Mirrors the confirm mutation's in-flight state to the host. */
    onBusyChange?: (busy: boolean) => void;
    /** Mirrors ban-scope changes to the host (the dialog's header reads it). */
    onScopeChange?: (scope: BanScope) => void;
}

/**
 * The verify/reject/remove/restore/ban form — reason-category picker,
 * notify toggle, ban scope, affected-runs preview, reason field and the
 * Cancel/Confirm footer, plus every confirm/undo mutation path. Presentation-
 * agnostic: `RunActionDialog` wraps it in the centered BoardDialog chrome,
 * and the board's run inspector renders it inline in its footer.
 */
export function RunActionForm({
    gameSlug,
    verb,
    target,
    onDone,
    onClose,
    defaultBanScope,
    onUndoComplete,
    confirmRef: confirmRefProp,
    reasonFieldRef: reasonFieldRefProp,
    autoFocus = false,
    onBusyChange,
    onScopeChange,
}: RunActionFormProps) {
    // Undo toasts (approve/remove/restore/ban) hand control back to the pane
    // via refreshAfterUndo so the card/list reflects the reversal.
    const refreshAfterUndo = onUndoComplete ?? onDone;

    const [reasonCat, setReasonCat] = useState<RemoveReason>('cheating');
    const [notify, setNotify] = useState<boolean>(
        removeReasonMeta('cheating').defaultNotify,
    );
    const [scope, setScope] = useState<BanScope>(defaultBanScope ?? 'category');
    /**
     * Remove's first question: this run, or this runner's whole presence on
     * the board? A moderator looking at one bad run of seventy had to remove
     * it, notice the next one, remove that, and so on — or leave the board
     * and find the runner tool. Asking up front turns seventy destructive
     * actions into one reversible rule.
     *
     * Only offered when the target says who the runner is (see
     * RunActionTarget) — a guest or a multi-run selection has no such choice.
     */
    const removeRunner =
        verb === 'remove' && target.kind === 'runs'
            ? (target.runner ?? null)
            : null;
    const [removeScope, setRemoveScope] = useState<'run' | 'runner'>('run');
    // 'runner' means an exclusion rule on the runner scoped to this board —
    // exactly what the Runner… dialog writes, reached from where the mod
    // already is. Guests and multi-run selections can never reach it.
    const removesRunner = removeRunner != null && removeScope === 'runner';
    const removeRunnerRule: UserExclusionRuleInput | null = removesRunner
        ? {
              type: 'user',
              targetId: removeRunner.id,
              categoryId: removeRunner.categoryId,
          }
        : null;

    /**
     * The runner's other times on this exact board, for the "which of these
     * is legit?" step. Loaded only while the per-run option is selected —
     * removing the runner outright makes the question moot.
     */
    const [otherRuns, setOtherRuns] = useState<UserEligibleRunRow[] | null>(
        null,
    );
    /**
     * The run the moderator says IS legit. Everything faster than it goes
     * with the removal, because a board always surfaces a runner's best
     * eligible run — leaving a faster invalid one behind would just promote
     * it into the slot being cleared.
     *
     * Null means "just this one": remove the target and let the board
     * surface whatever it surfaces.
     */
    const [legitRunId, setLegitRunId] = useState<number | null>(null);

    const [reason, setReason] = useState('');
    const [preview, setPreview] = useState<PreviewState | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPreviewing, startPreview] = useTransition();
    const [isConfirming, startConfirm] = useTransition();

    const changeScope = (next: BanScope) => {
        setScope(next);
        onScopeChange?.(next);
    };

    useEffect(() => {
        onBusyChange?.(isConfirming);
    }, [isConfirming, onBusyChange]);

    const targetRunIds = target.kind === 'runs' ? target.runIds : [];

    // Load the runner's other times on this board once, when the per-run
    // option is live. Never for the runner-scoped option: that removes all
    // of them, so there is nothing to choose between.
    useEffect(() => {
        if (!removeRunner || removesRunner) return;
        if (otherRuns != null) return;
        let cancelled = false;
        (async () => {
            const res = await loadUserEligibleRunsAction(
                gameSlug,
                removeRunner.id,
            );
            if (cancelled) return;
            if (!('ok' in res)) return setOtherRuns([]);
            setOtherRuns(
                res.rows
                    .filter(
                        (r) =>
                            r.categoryId === removeRunner.categoryId &&
                            r.subcategoryKey === removeRunner.subcategoryKey &&
                            !targetRunIds.includes(r.runId) &&
                            runTime(r, removeRunner.primaryTiming) != null,
                    )
                    .sort(
                        (a, b) =>
                            (runTime(a, removeRunner.primaryTiming) ?? 0) -
                            (runTime(b, removeRunner.primaryTiming) ?? 0),
                    ),
            );
        })();
        return () => {
            cancelled = true;
        };
        // targetRunIds is stable for a given dialog instance.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameSlug, removeRunner, removesRunner, otherRuns]);

    /**
     * Everything the confirm actually removes: the run the moderator opened
     * this on, plus anything faster than the one they called legit.
     */
    const fasterThanLegit =
        legitRunId != null && otherRuns != null && removeRunner
            ? (() => {
                  const legit = otherRuns.find((r) => r.runId === legitRunId);
                  const cutoff = legit
                      ? runTime(legit, removeRunner.primaryTiming)
                      : null;
                  if (cutoff == null) return [];
                  return otherRuns
                      .filter((r) => {
                          const t = runTime(r, removeRunner.primaryTiming);
                          return t != null && t < cutoff;
                      })
                      .map((r) => r.runId);
              })()
            : [];
    const runIds = [...targetRunIds, ...fasterThanLegit];
    const manualTimeIds =
        target.kind === 'runs' ? (target.manualTimeIds ?? []) : [];
    // How this verb lands on the selection's manual set times (if any):
    // verdicts map to the manual-time verdict endpoint, remove maps to
    // delete (manual times have no exclude machinery — delete IS their
    // removal). `unverify`/`restore`/`ban` have no manual equivalent and
    // skip them.
    const manualOp: 'verify' | 'reject' | 'delete' | null =
        verb === 'approve'
            ? 'verify'
            : verb === 'reject'
              ? 'reject'
              : verb === 'remove'
                ? 'delete'
                : null;
    const banRule: UserExclusionRuleInput | null =
        target.kind === 'runner'
            ? {
                  type: 'user',
                  targetId: target.runnerId,
                  categoryId: scope === 'category' ? target.categoryId : null,
              }
            : null;

    // Map the verb (+ notify for Remove) to a verdict action for the PREVIEW
    // request, or null when the route is an exclude instead. `restore` previews
    // as 'unreject' (shows which runs come back); its CONFIRM goes through
    // restoreRunsAction (include + unreject) instead — see handleConfirm.
    // `reject` is the bulk-bar's direct verdict verb — always the 'reject'
    // action, no notify branching (that nuance stays on `remove`).
    const previewVerdictAction: VerdictAction | null =
        verb === 'approve'
            ? 'verify'
            : verb === 'unverify'
              ? 'unverify'
              : verb === 'reject'
                ? 'reject'
                : verb === 'restore'
                  ? 'unreject'
                  : verb === 'remove' &&
                      !removesRunner &&
                      resolveRemoveMechanism(notify) === 'reject'
                    ? 'reject'
                    : null;

    // For CONFIRM, restore is NOT a plain verdict apply — exclude it here.
    const confirmVerdictAction: VerdictAction | null =
        verb === 'restore' ? null : previewVerdictAction;

    const loadPreview = useCallback(() => {
        startPreview(async () => {
            setPreviewError(null);
            // Removing the runner previews the RULE, not the one run — the
            // count the mod needs to see is "70 runs", not "1".
            if (removeRunnerRule) {
                const res = await previewExcludeAction(gameSlug, {
                    rule: removeRunnerRule,
                });
                if ('error' in res) return setPreviewError(res.error);
                return setPreview({ kind: 'exclude', data: res.preview });
            }
            if (verb === 'ban' && banRule) {
                const res = await previewExcludeAction(gameSlug, {
                    rule: banRule,
                });
                if ('error' in res) return setPreviewError(res.error);
                return setPreview({ kind: 'exclude', data: res.preview });
            }
            // A manual-times-only selection has no run preview to fetch —
            // the manual note under the summary is the whole preview.
            if (runIds.length === 0) return setPreview(null);
            if (previewVerdictAction) {
                const res = await previewVerdictsAction(
                    gameSlug,
                    previewVerdictAction,
                    runIds,
                );
                if ('error' in res) return setPreviewError(res.error);
                return setPreview({ kind: 'verdict', data: res.preview });
            }
            // Remove + quiet → exclude these runIds.
            const res = await previewExcludeAction(gameSlug, { runIds });
            if ('error' in res) return setPreviewError(res.error);
            setPreview({ kind: 'exclude', data: res.preview });
        });
        // banRule/verdictAction are derived from the deps below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameSlug, verb, notify, scope, removeScope, legitRunId]);

    // Reload whenever routing-relevant inputs change (notify flips reject↔exclude;
    // scope flips category↔game rule — each yields a different preview).
    useEffect(() => {
        loadPreview();
    }, [loadPreview]);

    const onReasonCatChange = (next: RemoveReason) => {
        setReasonCat(next);
        setNotify(removeReasonMeta(next).defaultNotify);
    };

    const reasonRequired = REASON_REQUIRED[verb];
    const reasonOk = reasonRequired ? reason.trim().length >= MIN_REASON : true;
    const confirmGatedOnPreview = PREVIEW_GATES_CONFIRM[verb] && isPreviewing;
    const busy = isConfirming || confirmGatedOnPreview;

    // Confirm button ref (approve/restore auto-focus this — reason is
    // optional, so Confirm is already actionable) and reason field ref
    // (remove/ban auto-focus this — reason is required). A wrapping dialog
    // supplies its own refs and drives focus through BoardDialog; inline
    // hosts opt into the mount-focus effect below via `autoFocus`.
    const ownConfirmRef = useRef<HTMLButtonElement>(null);
    const ownReasonFieldRef = useRef<HTMLTextAreaElement>(null);
    const confirmRef = confirmRefProp ?? ownConfirmRef;
    const reasonFieldRef = reasonFieldRefProp ?? ownReasonFieldRef;

    useEffect(() => {
        if (!autoFocus) return;
        (reasonRequired ? reasonFieldRef : confirmRef).current?.focus();
        // Mount-only — refs and reasonRequired are fixed for a given verb.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleConfirm = () => {
        if (!reasonOk) return;
        setError(null);
        startConfirm(async () => {
            const trimmed = reason.trim();
            // Optional-reason verbs (approve/restore): fall back to a
            // sensible default rather than sending an empty string the
            // backend would reject.
            const finalReason =
                trimmed.length > 0
                    ? trimmed
                    : (DEFAULT_REASON[verb] ?? trimmed);
            // Remove-the-runner writes one board-scoped rule instead of N
            // per-run removals: reversible in one place, and it catches the
            // runs they submit tomorrow as well as the seventy already here.
            if (removeRunnerRule && removeRunner) {
                const res = await excludeAction(gameSlug, {
                    rule: removeRunnerRule,
                    reason: finalReason,
                });
                if ('error' in res) return setError(res.error);
                const message = `${removeRunner.name} removed from ${removeRunner.categoryDisplay}.`;
                if ('ruleId' in res.result && isBanUndoable(res.result)) {
                    const ruleId = res.result.ruleId;
                    fireUndoToast(
                        message,
                        () =>
                            deleteRuleAction(
                                gameSlug,
                                ruleId,
                                undoReason(verb),
                            ),
                        refreshAfterUndo,
                    );
                } else {
                    // Already-existing rule: nothing new to undo, and
                    // deleting the pre-existing one would be a surprise.
                    toast.success(message);
                }
                return onDone();
            }
            if (verb === 'ban' && banRule) {
                const res = await excludeAction(gameSlug, {
                    rule: banRule,
                    reason: finalReason,
                });
                if ('error' in res) return setError(res.error);
                const message =
                    target.kind === 'runner'
                        ? `${target.runnerName} banned from ${scope === 'category' ? target.categoryDisplay : target.gameDisplay}.`
                        : 'Runner banned.';
                // A `ban` result is always CreateRuleResult (the branch only
                // ever calls excludeAction with a rule, never runIds).
                if (
                    'ruleId' in res.result &&
                    hasTrueInverse(verb) &&
                    isBanUndoable(res.result)
                ) {
                    const ruleId = res.result.ruleId;
                    fireUndoToast(
                        message,
                        () =>
                            deleteRuleAction(
                                gameSlug,
                                ruleId,
                                undoReason(verb),
                            ),
                        refreshAfterUndo,
                    );
                } else {
                    toast.success(message);
                }
                return onDone();
            }
            if (verb === 'restore') {
                const res = await restoreRunsAction(
                    gameSlug,
                    runIds,
                    finalReason,
                );
                if ('error' in res) return setError(res.error);
                fireUndoToast(
                    'Restored.',
                    () =>
                        excludeAction(gameSlug, {
                            runIds,
                            reason: undoReason(verb),
                        }),
                    refreshAfterUndo,
                );
                return onDone();
            }
            // The manual portion of a mixed selection. Runs first, manual
            // second; a manual failure surfaces as the dialog error even if
            // the runs part already applied (the toast/refresh only fire on
            // full success, so the mod sees exactly what didn't happen).
            const applyManualTimes = async (): Promise<string | null> => {
                if (manualOp == null || manualTimeIds.length === 0) {
                    return null;
                }
                const res = await manualTimesBulkAction(
                    gameSlug,
                    manualTimeIds,
                    manualOp,
                    finalReason,
                );
                if ('error' in res) return res.error;
                if (res.failed > 0) {
                    return `${res.failed} of ${manualTimeIds.length} set time${manualTimeIds.length === 1 ? '' : 's'} failed to update.`;
                }
                return null;
            };
            // Undo toasts only cover the runs machinery (verdicts/excludes
            // have true inverses; a deleted manual time doesn't). A mixed
            // action would leave the manual part un-undone, so it gets a
            // plain success toast instead of a lying Undo button.
            const manualInvolved = manualTimeIds.length > 0;
            if (confirmVerdictAction) {
                let n = 0;
                if (runIds.length > 0) {
                    const res = await applyVerdictsAction(
                        gameSlug,
                        confirmVerdictAction,
                        runIds,
                        finalReason,
                    );
                    if ('error' in res) return setError(res.error);
                    n = res.result.affectedRunCount;
                }
                const manualError = await applyManualTimes();
                if (manualError) return setError(manualError);
                const total = n + manualTimeIds.length;
                const message = `${VERB_TITLE[verb]} — ${total} run${total === 1 ? '' : 's'} updated.`;
                // Verify's inverse is `unverify` (verified → pending), not
                // restoreRunsAction's include+unreject — unreject is a no-op
                // against an already-verified run, so that generic undo path
                // would silently do nothing here.
                if (manualInvolved || runIds.length === 0) {
                    toast.success(message);
                } else if (verb === 'approve') {
                    fireUndoToast(
                        message,
                        () =>
                            applyVerdictsAction(
                                gameSlug,
                                'unverify',
                                runIds,
                                UNDO_VERIFY_REASON,
                            ),
                        refreshAfterUndo,
                    );
                } else if (verb === 'unverify') {
                    // Mirror of the approve branch: unverify's true inverse
                    // is re-verifying, not restoreRunsAction (include +
                    // unreject both no-op against a pending run).
                    fireUndoToast(
                        message,
                        () =>
                            applyVerdictsAction(
                                gameSlug,
                                'verify',
                                runIds,
                                undoReason(verb),
                            ),
                        refreshAfterUndo,
                    );
                } else if (hasTrueInverse(verb)) {
                    fireUndoToast(
                        message,
                        () =>
                            restoreRunsAction(
                                gameSlug,
                                runIds,
                                undoReason(verb),
                            ),
                        refreshAfterUndo,
                    );
                } else {
                    toast.success(message);
                }
                return onDone();
            }
            if (runIds.length > 0) {
                const res = await excludeAction(gameSlug, {
                    runIds,
                    reason: finalReason,
                });
                if ('error' in res) return setError(res.error);
            }
            {
                const manualError = await applyManualTimes();
                if (manualError) return setError(manualError);
            }
            if (manualInvolved || runIds.length === 0) {
                toast.success('Removed.');
            } else {
                fireUndoToast(
                    'Removed.',
                    () => restoreRunsAction(gameSlug, runIds, undoReason(verb)),
                    refreshAfterUndo,
                );
            }
            onDone();
        });
    };

    return (
        <>
            <div className={styles.body}>
                {/* Asked before the reason, because it changes what the
                    reason is for: one run, or this runner's whole presence
                    on the board. */}
                {removeRunner && (
                    <fieldset className="mb-3">
                        <legend className={styles.fieldLabel}>
                            What are you removing?
                        </legend>
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="remove-scope"
                                id="remove-scope-run"
                                checked={removeScope === 'run'}
                                disabled={isConfirming}
                                onChange={() => setRemoveScope('run')}
                            />
                            <label
                                className="form-check-label"
                                htmlFor="remove-scope-run"
                            >
                                Only this{' '}
                                {target.kind === 'runs' && target.label}
                            </label>
                        </div>
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="remove-scope"
                                id="remove-scope-runner"
                                checked={removeScope === 'runner'}
                                disabled={isConfirming}
                                onChange={() => setRemoveScope('runner')}
                            />
                            <label
                                className="form-check-label"
                                htmlFor="remove-scope-runner"
                            >
                                Every run {removeRunner.name} has on{' '}
                                {removeRunner.categoryDisplay}
                            </label>
                        </div>
                    </fieldset>
                )}

                {/* Removing the runner needs no per-run detail — say plainly
                    what it does and let the count in the preview carry the
                    scale. */}
                {removesRunner && removeRunner && (
                    <p className={styles.scopeNote}>
                        This removes <strong>{removeRunner.name}</strong> from{' '}
                        {removeRunner.categoryDisplay} completely — every run
                        they have on it, and any they submit later. One
                        reversible rule, not one removal per run. Their account
                        is unaffected.
                    </p>
                )}

                {/* Per-run: the board surfaces a runner's best eligible run,
                    so removing one just promotes the next. Asking which is
                    legit turns that into a single decision instead of a
                    remove-check-remove loop. */}
                {removeRunner && !removesRunner && otherRuns != null && (
                    <fieldset className="mb-3">
                        <legend className={styles.fieldLabel}>
                            {otherRuns.length === 0
                                ? 'Their other times'
                                : `Which of ${removeRunner.name}'s other times is legit?`}
                        </legend>
                        {otherRuns.length === 0 ? (
                            <p className="form-text mb-0">
                                They have no other times on this board — it
                                leaves nothing behind.
                            </p>
                        ) : (
                            <>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="legit-run"
                                        id="legit-none"
                                        checked={legitRunId == null}
                                        disabled={isConfirming}
                                        onChange={() => setLegitRunId(null)}
                                    />
                                    <label
                                        className="form-check-label"
                                        htmlFor="legit-none"
                                    >
                                        Just remove this one — I haven&apos;t
                                        checked the others
                                    </label>
                                </div>
                                {otherRuns.map((r) => (
                                    <div className="form-check" key={r.runId}>
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="legit-run"
                                            id={`legit-${r.runId}`}
                                            checked={legitRunId === r.runId}
                                            disabled={isConfirming}
                                            onChange={() =>
                                                setLegitRunId(r.runId)
                                            }
                                        />
                                        <label
                                            className="form-check-label"
                                            htmlFor={`legit-${r.runId}`}
                                        >
                                            <DurationToFormatted
                                                duration={
                                                    runTime(
                                                        r,
                                                        removeRunner.primaryTiming,
                                                    ) ?? 0
                                                }
                                            />{' '}
                                            <span className="text-body-secondary small">
                                                {r.verificationStatus}
                                            </span>
                                        </label>
                                    </div>
                                ))}
                                {fasterThanLegit.length > 0 && (
                                    <div className="form-text">
                                        Everything faster than that goes too —{' '}
                                        {fasterThanLegit.length} more{' '}
                                        {fasterThanLegit.length === 1
                                            ? 'run'
                                            : 'runs'}
                                        . A board always shows a runner&apos;s
                                        best eligible run, so leaving a faster
                                        one behind would just promote it.
                                    </div>
                                )}
                            </>
                        )}
                    </fieldset>
                )}
                {verb === 'remove' && (
                    <div className="mb-3">
                        <label
                            htmlFor="remove-reason-cat"
                            className={styles.fieldLabel}
                        >
                            Why are you removing this?
                        </label>
                        <select
                            id="remove-reason-cat"
                            className="form-select form-select-sm"
                            value={reasonCat}
                            onChange={(e) =>
                                onReasonCatChange(
                                    e.target.value as RemoveReason,
                                )
                            }
                            disabled={isConfirming}
                        >
                            {REMOVE_REASONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                        <div className="form-text">
                            {removeReasonMeta(reasonCat).blurb}
                        </div>
                        {/* The runner-scoped removal is an exclusion rule,
                            which has no verdict to appeal against — offering
                            the toggle there would promise a notification
                            nothing sends. */}
                        {!removesRunner && (
                            <div className="form-check form-switch mt-2">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    id="remove-notify"
                                    checked={notify}
                                    onChange={(e) =>
                                        setNotify(e.target.checked)
                                    }
                                    disabled={isConfirming}
                                />
                                <label
                                    className="form-check-label small"
                                    htmlFor="remove-notify"
                                >
                                    Notify the runner and allow an appeal
                                </label>
                            </div>
                        )}
                    </div>
                )}

                {verb === 'ban' && target.kind === 'runner' && (
                    <div className="mb-3 d-flex gap-3">
                        <div className="form-check">
                            <input
                                type="radio"
                                className="form-check-input"
                                id="ban-scope-category"
                                name="ban-scope"
                                checked={scope === 'category'}
                                onChange={() => changeScope('category')}
                                disabled={isConfirming}
                            />
                            <label
                                htmlFor="ban-scope-category"
                                className="form-check-label small"
                            >
                                From this category
                            </label>
                        </div>
                        <div className="form-check">
                            <input
                                type="radio"
                                className="form-check-input"
                                id="ban-scope-game"
                                name="ban-scope"
                                checked={scope === 'game'}
                                onChange={() => changeScope('game')}
                                disabled={isConfirming}
                            />
                            <label
                                htmlFor="ban-scope-game"
                                className="form-check-label small"
                            >
                                From the entire game
                            </label>
                        </div>
                    </div>
                )}

                {isPreviewing && (
                    <p className={styles.previewLoading}>Loading preview…</p>
                )}
                {previewError && (
                    <div className={styles.errorAlert} role="alert">
                        {previewError}
                    </div>
                )}

                {manualTimeIds.length > 0 && manualOp != null && (
                    <p className={styles.previewSummary}>
                        <strong>{manualTimeIds.length}</strong> set time
                        {manualTimeIds.length === 1 ? '' : 's'} will be{' '}
                        {manualOp === 'delete'
                            ? 'deleted — a deleted set time cannot be restored'
                            : manualOp === 'verify'
                              ? 'verified'
                              : 'rejected'}
                        .
                    </p>
                )}

                {preview && (
                    <p className={styles.previewSummary}>
                        <strong>{preview.data.affectedRunCount}</strong> run
                        {preview.data.affectedRunCount === 1 ? '' : 's'}{' '}
                        affected across{' '}
                        <strong>
                            {preview.data.affectedLeaderboards.length}
                        </strong>{' '}
                        leaderboard
                        {preview.data.affectedLeaderboards.length === 1
                            ? ''
                            : 's'}
                        .
                    </p>
                )}

                {preview?.kind === 'verdict' &&
                    ((preview.data.skippedRunCount ?? 0) > 0 ||
                        (preview.data.notFoundRunCount ?? 0) > 0) && (
                        <p className={styles.previewLoading}>
                            {(preview.data.skippedRunCount ?? 0) > 0 &&
                                `${preview.data.skippedRunCount} will be skipped (wrong state).`}
                            {(preview.data.skippedRunCount ?? 0) > 0 &&
                                (preview.data.notFoundRunCount ?? 0) > 0 &&
                                ' '}
                            {(preview.data.notFoundRunCount ?? 0) > 0 &&
                                `${preview.data.notFoundRunCount} not found.`}
                        </p>
                    )}

                {preview?.kind === 'verdict' &&
                    preview.data.sampleRuns.length > 0 && (
                        <div className="table-responsive">
                            <table className="table table-sm align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>Runner</th>
                                        <th className={styles.timeCell}>
                                            Time
                                        </th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.data.sampleRuns.map((s) => (
                                        <tr key={s.runId}>
                                            <td>{s.runnerName}</td>
                                            <td className={styles.timeCell}>
                                                <DurationToFormatted
                                                    duration={s.timeMs}
                                                />
                                            </td>
                                            <td className="small text-muted">
                                                {s.currentStatus}
                                                {' → '}
                                                {s.newStatus}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                {preview?.kind === 'exclude' &&
                    preview.data.sampleRuns.length > 0 && (
                        <ul className={styles.previewList}>
                            {preview.data.sampleRuns.map((s) => (
                                <li key={s.runId}>
                                    {s.runnerName} — {s.categoryName}
                                    {s.subcategoryKey
                                        ? ` (${s.subcategoryKey})`
                                        : ''}{' '}
                                    {s.time != null && (
                                        <span className={styles.previewTime}>
                                            <DurationToFormatted
                                                duration={s.time}
                                            />
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                <div className="mt-3">
                    <label
                        htmlFor="run-action-reason"
                        className={styles.fieldLabel}
                    >
                        {reasonRequired
                            ? `Reason — required, min ${MIN_REASON} characters, audit-logged`
                            : 'Note — optional, audit-logged'}
                    </label>
                    <textarea
                        id="run-action-reason"
                        ref={reasonFieldRef}
                        className={styles.reasonTextarea}
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={isConfirming}
                    />
                    {reasonRequired && !reasonOk && reason.length > 0 && (
                        <div className={styles.reasonError}>
                            {MIN_REASON - reason.trim().length} more needed.
                        </div>
                    )}
                </div>

                {error && (
                    <div className={styles.errorAlert} role="alert">
                        {error}
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onClose}
                    disabled={isConfirming}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    ref={confirmRef}
                    className={`btn btn-sm ${
                        verb === 'approve'
                            ? 'btn-success'
                            : verb === 'unverify'
                              ? // Neither an endorsement nor a strike — just
                                // back to the queue.
                                'btn-secondary'
                              : 'btn-danger'
                    }`}
                    onClick={handleConfirm}
                    disabled={busy || !reasonOk || !!previewError}
                >
                    {isConfirming
                        ? 'Working…'
                        : `Confirm ${VERB_TITLE[verb].toLowerCase()}`}
                </button>
            </div>
        </>
    );
}

interface Props {
    gameSlug: string;
    verb: ModVerb;
    target: RunActionTarget;
    onDone: () => void;
    onClose: () => void;
    /** Initial ban scope for a `ban` verb (default 'category'). */
    defaultBanScope?: BanScope;
    /** See RunActionFormProps.onUndoComplete. */
    onUndoComplete?: () => void;
}

export function RunActionDialog({
    gameSlug,
    verb,
    target,
    onDone,
    onClose,
    defaultBanScope,
    onUndoComplete,
}: Props) {
    // Mirror of the form's in-flight confirm state — gates the header close
    // button and Escape, same as Cancel inside the form.
    const [busy, setBusy] = useState(false);
    // Mirror of the form's ban scope — the header's target line reads it.
    const [scope, setScope] = useState<BanScope>(defaultBanScope ?? 'category');

    const confirmRef = useRef<HTMLButtonElement>(null);
    const reasonFieldRef = useRef<HTMLTextAreaElement>(null);
    const initialFocusRef = REASON_REQUIRED[verb] ? reasonFieldRef : confirmRef;

    const headerTarget =
        target.kind === 'runs'
            ? target.label
            : `${target.runnerName} · ${scope === 'category' ? target.categoryDisplay : `${target.gameDisplay} (entire game)`}`;

    // Ignore close requests (Escape included) while a confirm mutation is in
    // flight — mirrors the disabled Cancel/close-button state.
    const requestClose = () => {
        if (!busy) onClose();
    };

    return (
        <BoardDialog
            open
            onClose={requestClose}
            labelledBy="run-action-title"
            size="lg"
            closeOnBackdropClick={false}
            initialFocusRef={initialFocusRef}
        >
            <div className={styles.header}>
                <h5 className={styles.title} id="run-action-title">
                    {VERB_TITLE[verb]} — {headerTarget}
                </h5>
                <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={requestClose}
                    disabled={busy}
                />
            </div>
            <RunActionForm
                gameSlug={gameSlug}
                verb={verb}
                target={target}
                onDone={onDone}
                onClose={requestClose}
                defaultBanScope={defaultBanScope}
                onUndoComplete={onUndoComplete}
                confirmRef={confirmRef}
                reasonFieldRef={reasonFieldRef}
                onBusyChange={setBusy}
                onScopeChange={setScope}
            />
        </BoardDialog>
    );
}
