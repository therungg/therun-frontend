'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    PreviewExcludeResult,
    UserExclusionRuleInput,
    VerdictAction,
    VerdictPreviewResult,
} from '../../../../../../../types/moderation.types';
import {
    type BanScope,
    type ModVerb,
    REMOVE_REASONS,
    type RemoveReason,
    type RunActionTarget,
    removeReasonMeta,
    resolveRemoveMechanism,
} from './action-model';
import { excludeAction, previewExcludeAction } from './actions/exclude.action';
import { restoreRunsAction } from './actions/restore.action';
import {
    applyVerdictsAction,
    previewVerdictsAction,
} from './actions/verdicts.action';

interface Props {
    gameSlug: string;
    verb: ModVerb;
    target: RunActionTarget;
    onDone: () => void;
    onClose: () => void;
    /** Initial ban scope for a `ban` verb (default 'category'). */
    defaultBanScope?: BanScope;
}

const MIN_REASON = 10;

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
}: Props) {
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

    const reasonOk = reason.trim().length >= MIN_REASON;
    const busy = isPreviewing || isConfirming;

    const handleConfirm = () => {
        if (!reasonOk) return;
        setError(null);
        startConfirm(async () => {
            const trimmed = reason.trim();
            if (verb === 'ban' && banRule) {
                const res = await excludeAction(gameSlug, {
                    rule: banRule,
                    reason: trimmed,
                });
                if ('error' in res) return setError(res.error);
                toast.success(
                    target.kind === 'runner'
                        ? `${target.runnerName} banned from ${scope === 'category' ? target.categoryDisplay : target.gameDisplay}.`
                        : 'Runner banned.',
                );
                return onDone();
            }
            if (verb === 'restore') {
                const res = await restoreRunsAction(gameSlug, runIds, trimmed);
                if ('error' in res) return setError(res.error);
                toast.success('Restored.');
                return onDone();
            }
            if (confirmVerdictAction) {
                const res = await applyVerdictsAction(
                    gameSlug,
                    confirmVerdictAction,
                    runIds,
                    trimmed,
                );
                if ('error' in res) return setError(res.error);
                toast.success(`${VERB_TITLE[verb]} — done.`);
                return onDone();
            }
            const res = await excludeAction(gameSlug, {
                runIds,
                reason: trimmed,
            });
            if ('error' in res) return setError(res.error);
            toast.success('Removed.');
            onDone();
        });
    };

    const headerTarget =
        target.kind === 'runs'
            ? target.label
            : `${target.runnerName} · ${scope === 'category' ? target.categoryDisplay : `${target.gameDisplay} (entire game)`}`;

    return (
        <div
            className="modal d-block"
            tabIndex={-1}
            role="dialog"
            style={{ background: 'rgba(0,0,0,0.5)' }}
        >
            <div
                className="modal-dialog modal-lg modal-dialog-scrollable"
                role="document"
            >
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {VERB_TITLE[verb]} — {headerTarget}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={onClose}
                            disabled={isConfirming}
                        />
                    </div>
                    <div className="modal-body">
                        {verb === 'remove' && (
                            <div className="mb-3">
                                <label
                                    htmlFor="remove-reason-cat"
                                    className="form-label small text-muted mb-1"
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
                            <p className="text-muted">Loading preview…</p>
                        )}
                        {previewError && (
                            <div
                                className="alert alert-danger py-2"
                                role="alert"
                            >
                                {previewError}
                            </div>
                        )}

                        {preview && (
                            <p className="mb-2">
                                <strong>{preview.data.affectedRunCount}</strong>{' '}
                                run
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
                                                <th className="text-end">
                                                    Time
                                                </th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.data.sampleRuns.map(
                                                (s) => (
                                                    <tr key={s.runId}>
                                                        <td>{s.runnerName}</td>
                                                        <td className="text-end">
                                                            <DurationToFormatted
                                                                duration={
                                                                    s.timeMs
                                                                }
                                                            />
                                                        </td>
                                                        <td className="small text-muted">
                                                            {s.currentStatus}
                                                            {' → '}
                                                            {s.newStatus}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                        {preview?.kind === 'exclude' &&
                            preview.data.sampleRuns.length > 0 && (
                                <ul className="small mb-0">
                                    {preview.data.sampleRuns.map((s) => (
                                        <li key={s.runId}>
                                            {s.runnerName} — {s.categoryName}
                                            {s.subcategoryKey
                                                ? ` (${s.subcategoryKey})`
                                                : ''}{' '}
                                            {s.time != null && (
                                                <DurationToFormatted
                                                    duration={s.time}
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                        <div className="mt-3">
                            <label
                                htmlFor="run-action-reason"
                                className="form-label small text-muted mb-1"
                            >
                                Reason — required, min {MIN_REASON} characters,
                                audit-logged
                            </label>
                            <textarea
                                id="run-action-reason"
                                className="form-control form-control-sm"
                                rows={3}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={isConfirming}
                            />
                            {!reasonOk && reason.length > 0 && (
                                <small className="text-danger">
                                    {MIN_REASON - reason.trim().length} more
                                    needed.
                                </small>
                            )}
                        </div>

                        {error && (
                            <div
                                className="alert alert-danger py-2 mt-2 mb-0"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
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
                            className={`btn btn-sm ${verb === 'approve' ? 'btn-success' : 'btn-danger'}`}
                            onClick={handleConfirm}
                            disabled={busy || !reasonOk || !!previewError}
                        >
                            {isConfirming
                                ? 'Working…'
                                : `Confirm ${VERB_TITLE[verb].toLowerCase()}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
