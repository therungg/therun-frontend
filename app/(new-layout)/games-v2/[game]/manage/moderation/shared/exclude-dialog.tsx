'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { PreviewExcludeResult } from '../../../../../../../types/moderation.types';
import {
    type ExcludeTarget,
    excludeAction,
    previewExcludeAction,
} from './actions/exclude.action';

interface Props {
    gameSlug: string;
    target: ExcludeTarget;
    /** Optional human hint about the rule shape suggested for these runs. */
    ruleHint?: string;
    onDone: () => void;
    onClose: () => void;
}

const MIN_REASON = 10;

function describeTarget(target: ExcludeTarget): string {
    if ('runIds' in target) {
        const n = target.runIds.length;
        return `${n} run${n === 1 ? '' : 's'}`;
    }
    return target.rule.categoryId != null
        ? 'user from this category'
        : 'user from the whole game';
}

export function ExcludeDialog({
    gameSlug,
    target,
    ruleHint,
    onDone,
    onClose,
}: Props) {
    const [preview, setPreview] = useState<PreviewExcludeResult | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPreviewing, startPreview] = useTransition();
    const [isConfirming, startConfirm] = useTransition();

    // Load the blast-radius preview once on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        startPreview(async () => {
            const res = await previewExcludeAction(gameSlug, target);
            if ('error' in res) {
                setPreviewError(res.error);
                return;
            }
            setPreviewError(null);
            setPreview(res.preview);
        });
        // The target is fixed for the lifetime of this dialog instance.
    }, []);

    const reasonOk = reason.trim().length >= MIN_REASON;

    const handleConfirm = () => {
        if (!reasonOk) return;
        setError(null);
        startConfirm(async () => {
            const res = await excludeAction(gameSlug, {
                ...target,
                reason: reason.trim(),
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            if ('affectedRunCount' in res.result) {
                const n = res.result.affectedRunCount;
                toast.success(
                    `Excluded — ${n} run${n === 1 ? '' : 's'} affected.`,
                );
            } else if (res.result.alreadyExists) {
                toast.info('Exclusion rule already existed.');
            } else {
                toast.success('Exclusion rule created.');
            }
            onDone();
        });
    };

    const busy = isPreviewing || isConfirming;

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
                            Exclude {describeTarget(target)}
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
                        {ruleHint && (
                            <div className="alert alert-info py-2" role="alert">
                                {ruleHint}
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
                            <>
                                <p className="mb-2">
                                    <strong>{preview.affectedRunCount}</strong>{' '}
                                    run
                                    {preview.affectedRunCount === 1 ? '' : 's'}{' '}
                                    will be excluded across{' '}
                                    <strong>
                                        {preview.affectedLeaderboards.length}
                                    </strong>{' '}
                                    leaderboard
                                    {preview.affectedLeaderboards.length === 1
                                        ? ''
                                        : 's'}
                                    .
                                </p>

                                {preview.affectedLeaderboards.map((lb) => (
                                    <div
                                        key={`${lb.categoryId}:${lb.subcategoryKey}`}
                                        className="mb-3"
                                    >
                                        <div className="fw-bold small">
                                            {lb.categoryName}
                                            {lb.subcategoryKey
                                                ? ` — ${lb.subcategoryKey}`
                                                : ''}{' '}
                                            <span className="text-muted fw-normal">
                                                ({lb.affectedInThisLeaderboard}{' '}
                                                affected)
                                            </span>
                                        </div>
                                        {lb.rankChanges.length > 0 && (
                                            <div className="table-responsive">
                                                <table className="table table-sm align-middle mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th>Runner</th>
                                                            <th className="text-end">
                                                                Rank
                                                            </th>
                                                            <th className="text-end">
                                                                RT
                                                            </th>
                                                            <th className="text-end">
                                                                GT
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {lb.rankChanges.map(
                                                            (rc) => (
                                                                <tr
                                                                    key={`${rc.userId ?? rc.runnerName}:${rc.currentRank}`}
                                                                >
                                                                    <td>
                                                                        {
                                                                            rc.runnerName
                                                                        }
                                                                    </td>
                                                                    <td className="text-end">
                                                                        {
                                                                            rc.currentRank
                                                                        }
                                                                        {' → '}
                                                                        {rc.newRank ??
                                                                            '—'}
                                                                    </td>
                                                                    <td className="text-end">
                                                                        {rc.time !=
                                                                        null ? (
                                                                            <DurationToFormatted
                                                                                duration={
                                                                                    rc.time
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            '—'
                                                                        )}
                                                                    </td>
                                                                    <td className="text-end">
                                                                        {rc.gameTime !=
                                                                        null ? (
                                                                            <DurationToFormatted
                                                                                duration={
                                                                                    rc.gameTime
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            '—'
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {preview.sampleRuns.length > 0 && (
                                    <details className="mb-2">
                                        <summary className="small text-muted">
                                            Sample runs (
                                            {preview.sampleRuns.length})
                                        </summary>
                                        <ul className="small mb-0 mt-2">
                                            {preview.sampleRuns.map((s) => (
                                                <li key={s.runId}>
                                                    {s.runnerName} —{' '}
                                                    {s.categoryName}
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
                                    </details>
                                )}
                            </>
                        )}

                        <div className="mt-3">
                            <label
                                htmlFor="exclude-reason"
                                className="form-label small text-muted mb-1"
                            >
                                Reason — required, min {MIN_REASON} characters,
                                audit-logged
                            </label>
                            <textarea
                                id="exclude-reason"
                                className="form-control form-control-sm"
                                rows={3}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={isConfirming}
                            />
                            {!reasonOk && reason.length > 0 && (
                                <small className="text-danger">
                                    {MIN_REASON - reason.trim().length} more
                                    character
                                    {MIN_REASON - reason.trim().length === 1
                                        ? ''
                                        : 's'}{' '}
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
                            className="btn btn-sm btn-danger"
                            onClick={handleConfirm}
                            disabled={busy || !reasonOk || !!previewError}
                        >
                            {isConfirming ? 'Excluding…' : 'Confirm exclude'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
