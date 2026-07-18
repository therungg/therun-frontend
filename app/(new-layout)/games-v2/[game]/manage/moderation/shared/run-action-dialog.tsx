'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    PreviewExcludeResult,
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
    undoReason,
} from './action-model';
import { excludeAction, previewExcludeAction } from './actions/exclude.action';
import { restoreRunsAction } from './actions/restore.action';
import {
    applyVerdictsAction,
    previewVerdictsAction,
} from './actions/verdicts.action';
import styles from './run-action-dialog.module.scss';

interface Props {
    gameSlug: string;
    verb: ModVerb;
    target: RunActionTarget;
    onDone: () => void;
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
}

type UndoResult = { error: string } | { ok: true };

// Toast body for a reversible action's success toast. Owns its own pending
// state so the Undo button disables the instant it's clicked and stays
// disabled through the in-flight call — `closeToast()` (called on click,
// below) triggers an async exit transition, so without this the button
// would remain clickable (and re-clickable) while the toast fades out.
function UndoToast({
    message,
    undo,
    onUndone,
    closeToast,
}: {
    message: string;
    undo: () => Promise<UndoResult>;
    onUndone: () => void;
    closeToast: () => void;
}) {
    const [isPending, startTransition] = useTransition();

    const handleUndo = () => {
        closeToast();
        startTransition(async () => {
            try {
                const res = await undo();
                if ('error' in res) {
                    toast.error(res.error);
                    return;
                }
                toast.success('Undone.');
                onUndone();
            } catch {
                // Transport-level failure (dropped connection, mid-deploy
                // RSC error) — the inverse action's `{error}` path only
                // covers handled failures, so a rejected promise needs its
                // own surface.
                toast.error(
                    "Couldn't undo — check your connection and try again.",
                );
            }
        });
    };

    return (
        <div className={styles.toastBody}>
            <span>{message}</span>
            <button
                type="button"
                className={`btn btn-sm btn-outline-secondary ${styles.toastUndo}`}
                onClick={handleUndo}
                disabled={isPending}
            >
                {isPending ? 'Undoing…' : 'Undo'}
            </button>
        </div>
    );
}

const MIN_REASON = 10;

// approve/restore are fast triage: Confirm doesn't wait on the preview
// round-trip — the affected-run summary streams into the body as
// supporting detail ("Loading preview…" while it's in flight), never
// blocking the action itself. remove/ban keep the gate: the
// affected-boards preview IS their safety mechanism before a harder-to-
// reverse action, so Confirm stays disabled until it resolves.
const PREVIEW_GATES_CONFIRM: Record<ModVerb, boolean> = {
    approve: false,
    restore: false,
    remove: true,
    ban: true,
};

// approve/restore are fast triage — a note is optional and audit-logged, not
// gated. remove/ban (and bulk variants of both, which reuse these same verbs)
// stay gated at MIN_REASON since they're consequential for the runner.
const REASON_REQUIRED: Record<ModVerb, boolean> = {
    approve: false,
    restore: false,
    remove: true,
    ban: true,
};

// Sent when the moderator leaves the note blank on a verb where it's
// optional. The backend's verdict/exclude endpoints reject an empty reason
// (see src/lib/moderation/mod-fetch.ts's documented error, "reason is
// required (min 10 characters)"), so these stand in rather than sending "".
const DEFAULT_REASON: Partial<Record<ModVerb, string>> = {
    approve: 'Approved — no issues found.',
    restore: 'Restored after review.',
};

type PreviewState =
    | { kind: 'verdict'; data: VerdictPreviewResult }
    | { kind: 'exclude'; data: PreviewExcludeResult };

const VERB_TITLE: Record<ModVerb, string> = {
    approve: 'Approve',
    remove: 'Remove',
    restore: 'Restore',
    ban: 'Ban runner',
};

export function RunActionDialog({
    gameSlug,
    verb,
    target,
    onDone,
    onClose,
    defaultBanScope,
    onUndoComplete,
}: Props) {
    const refreshAfterUndo = onUndoComplete ?? onDone;

    // Fires a success toast with a 10s-live Undo action. Clicking it runs
    // `undo`, surfaces the result, then hands control back to the pane via
    // refreshAfterUndo so the card/list reflects the reversal.
    const fireUndoToast = useCallback(
        (message: string, undo: () => Promise<UndoResult>) => {
            toast.success(
                ({ closeToast }) => (
                    <UndoToast
                        message={message}
                        undo={undo}
                        onUndone={refreshAfterUndo}
                        closeToast={closeToast}
                    />
                ),
                { autoClose: 10000 },
            );
        },
        [refreshAfterUndo],
    );

    const [reasonCat, setReasonCat] = useState<RemoveReason>('cheating');
    const [notify, setNotify] = useState<boolean>(
        removeReasonMeta('cheating').defaultNotify,
    );
    const [scope, setScope] = useState<BanScope>(defaultBanScope ?? 'category');
    const [reason, setReason] = useState('');
    const [preview, setPreview] = useState<PreviewState | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPreviewing, startPreview] = useTransition();
    const [isConfirming, startConfirm] = useTransition();

    const runIds = target.kind === 'runs' ? target.runIds : [];
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
    const previewVerdictAction: VerdictAction | null =
        verb === 'approve'
            ? 'verify'
            : verb === 'restore'
              ? 'unreject'
              : verb === 'remove' && resolveRemoveMechanism(notify) === 'reject'
                ? 'reject'
                : null;

    // For CONFIRM, restore is NOT a plain verdict apply — exclude it here.
    const confirmVerdictAction: VerdictAction | null =
        verb === 'restore' ? null : previewVerdictAction;

    const loadPreview = useCallback(() => {
        startPreview(async () => {
            setPreviewError(null);
            if (verb === 'ban' && banRule) {
                const res = await previewExcludeAction(gameSlug, {
                    rule: banRule,
                });
                if ('error' in res) return setPreviewError(res.error);
                return setPreview({ kind: 'exclude', data: res.preview });
            }
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
    }, [gameSlug, verb, notify, scope]);

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
    // (remove/ban auto-focus this — reason is required).
    const confirmRef = useRef<HTMLButtonElement>(null);
    const reasonFieldRef = useRef<HTMLTextAreaElement>(null);
    const initialFocusRef = reasonRequired ? reasonFieldRef : confirmRef;

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
                    fireUndoToast(message, () =>
                        deleteRuleAction(gameSlug, ruleId, undoReason(verb)),
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
                fireUndoToast('Restored.', () =>
                    excludeAction(gameSlug, {
                        runIds,
                        reason: undoReason(verb),
                    }),
                );
                return onDone();
            }
            if (confirmVerdictAction) {
                const res = await applyVerdictsAction(
                    gameSlug,
                    confirmVerdictAction,
                    runIds,
                    finalReason,
                );
                if ('error' in res) return setError(res.error);
                const n = res.result.affectedRunCount;
                const message = `${VERB_TITLE[verb]} — ${n} run${n === 1 ? '' : 's'} updated.`;
                if (hasTrueInverse(verb)) {
                    fireUndoToast(message, () =>
                        restoreRunsAction(gameSlug, runIds, undoReason(verb)),
                    );
                } else {
                    toast.success(message);
                }
                return onDone();
            }
            const res = await excludeAction(gameSlug, {
                runIds,
                reason: finalReason,
            });
            if ('error' in res) return setError(res.error);
            fireUndoToast('Removed.', () =>
                restoreRunsAction(gameSlug, runIds, undoReason(verb)),
            );
            onDone();
        });
    };

    const headerTarget =
        target.kind === 'runs'
            ? target.label
            : `${target.runnerName} · ${scope === 'category' ? target.categoryDisplay : `${target.gameDisplay} (entire game)`}`;

    // Ignore close requests (Escape included) while a confirm mutation is in
    // flight — mirrors the disabled Cancel/close-button state below.
    const requestClose = () => {
        if (!isConfirming) onClose();
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
                    disabled={isConfirming}
                />
            </div>

            <div className={styles.body}>
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
                        <div className="form-check form-switch mt-2">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id="remove-notify"
                                checked={notify}
                                onChange={(e) => setNotify(e.target.checked)}
                                disabled={isConfirming}
                            />
                            <label
                                className="form-check-label small"
                                htmlFor="remove-notify"
                            >
                                Notify the runner and allow an appeal
                            </label>
                        </div>
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
                                onChange={() => setScope('category')}
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
                                onChange={() => setScope('game')}
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
                    onClick={requestClose}
                    disabled={isConfirming}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    ref={confirmRef}
                    className={`btn btn-sm ${verb === 'approve' ? 'btn-success' : 'btn-danger'}`}
                    onClick={handleConfirm}
                    disabled={busy || !reasonOk || !!previewError}
                >
                    {isConfirming
                        ? 'Working…'
                        : `Confirm ${VERB_TITLE[verb].toLowerCase()}`}
                </button>
            </div>
        </BoardDialog>
    );
}
