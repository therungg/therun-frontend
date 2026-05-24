'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    ManualTimePreviewResult,
    ManualTimeRow,
    ModTiming,
    RunnerRef,
} from '../../../../../../../types/moderation.types';
import {
    createManualTimeAction,
    previewManualTimeAction,
    updateManualTimeAction,
} from './actions/manual-times.action';
import { msToTimeInput, parseTimeInput } from './time-format';

interface Props {
    gameSlug: string;
    runnerRef: RunnerRef;
    runnerLabel: string;
    categoryId: number;
    categoryLabel?: string;
    subcategoryKey: string;
    /** Present => edit an existing manual time (timing is then fixed). */
    existing?: ManualTimeRow;
    onDone: () => void;
    onClose: () => void;
}

const MIN_REASON = 10;

export function ManualTimeDialog({
    gameSlug,
    runnerRef,
    runnerLabel,
    categoryId,
    categoryLabel,
    subcategoryKey,
    existing,
    onDone,
    onClose,
}: Props) {
    const isEdit = !!existing;
    const [timing, setTiming] = useState<ModTiming>(
        existing?.timing ?? 'realtime',
    );
    const [timeText, setTimeText] = useState(msToTimeInput(existing?.timeMs));
    const [evidenceUrl, setEvidenceUrl] = useState(existing?.evidenceUrl ?? '');
    const [reason, setReason] = useState('');
    const [preview, setPreview] = useState<ManualTimePreviewResult | null>(
        null,
    );
    const [error, setError] = useState<string | null>(null);
    const [isPreviewing, startPreview] = useTransition();
    const [isSaving, startSave] = useTransition();

    const timeMs = parseTimeInput(timeText);
    const timeValid = timeMs != null && !Number.isNaN(timeMs);
    const reasonOk = reason.trim().length >= MIN_REASON;
    const busy = isPreviewing || isSaving;

    const handlePreview = () => {
        if (!timeValid) return;
        setError(null);
        startPreview(async () => {
            const res = await previewManualTimeAction(gameSlug, {
                runnerRef,
                categoryId,
                subcategoryKey,
                timing,
                timeMs: timeMs as number,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setPreview(res.preview);
        });
    };

    const handleSave = () => {
        if (!timeValid || !reasonOk) return;
        setError(null);
        startSave(async () => {
            const res = isEdit
                ? await updateManualTimeAction(gameSlug, existing.id, {
                      reason: reason.trim(),
                      timeMs: timeMs as number,
                      evidenceUrl: evidenceUrl.trim() || null,
                  })
                : await createManualTimeAction(gameSlug, {
                      runnerRef,
                      categoryId,
                      subcategoryKey,
                      timing,
                      timeMs: timeMs as number,
                      evidenceUrl: evidenceUrl.trim() || null,
                      reason: reason.trim(),
                  });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success(isEdit ? 'Manual time updated.' : 'Manual time set.');
            onDone();
        });
    };

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
                            {isEdit ? 'Edit manual time' : 'Set manual time'}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={onClose}
                            disabled={isSaving}
                        />
                    </div>
                    <div className="modal-body">
                        <p className="small text-muted mb-3">
                            Asserting a leaderboard time for{' '}
                            <strong>{runnerLabel}</strong>
                            {categoryLabel ? ` in ${categoryLabel}` : ''}
                            {subcategoryKey ? ` · ${subcategoryKey}` : ''}. This
                            time counts on the board even without a matching
                            run; a faster eligible run will beat it
                            automatically.
                        </p>

                        <div className="row g-2">
                            <div className="col-md-4">
                                <label
                                    htmlFor="mt-timing"
                                    className="form-label small text-muted mb-1"
                                >
                                    Timing
                                </label>
                                <select
                                    id="mt-timing"
                                    className="form-select form-select-sm"
                                    value={timing}
                                    onChange={(e) =>
                                        setTiming(e.target.value as ModTiming)
                                    }
                                    disabled={isEdit || busy}
                                >
                                    <option value="realtime">Real time</option>
                                    <option value="gametime">Game time</option>
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label
                                    htmlFor="mt-time"
                                    className="form-label small text-muted mb-1"
                                >
                                    Time (h:mm:ss.SSS)
                                </label>
                                <input
                                    id="mt-time"
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={timeText}
                                    onChange={(e) => {
                                        setTimeText(e.target.value);
                                        setPreview(null);
                                    }}
                                    placeholder="e.g. 35:48 or 1:23:45"
                                    disabled={busy}
                                />
                            </div>
                            <div className="col-md-4 d-flex align-items-end">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={handlePreview}
                                    disabled={busy || !timeValid}
                                >
                                    {isPreviewing
                                        ? 'Previewing…'
                                        : 'Preview impact'}
                                </button>
                            </div>
                        </div>

                        {timeText.length > 0 && !timeValid && (
                            <small className="text-danger">
                                Enter a valid positive time (h:mm:ss, m:ss, or
                                m:ss.SSS).
                            </small>
                        )}

                        <div className="mt-2">
                            <label
                                htmlFor="mt-evidence"
                                className="form-label small text-muted mb-1"
                            >
                                Evidence URL (optional)
                            </label>
                            <input
                                id="mt-evidence"
                                type="url"
                                className="form-control form-control-sm"
                                value={evidenceUrl}
                                onChange={(e) => setEvidenceUrl(e.target.value)}
                                placeholder="https://… (VOD / proof)"
                                disabled={busy}
                            />
                        </div>

                        {preview && (
                            <div className="border rounded p-2 mt-3">
                                <p className="mb-2 small">
                                    Lands at rank{' '}
                                    <strong>
                                        {preview.resultingEntry.rank ?? '—'}
                                    </strong>{' '}
                                    with{' '}
                                    <DurationToFormatted
                                        duration={preview.resultingEntry.timeMs}
                                    />
                                    .{' '}
                                    {preview.beatsExistingEntry
                                        ? 'Becomes their board entry.'
                                        : 'Does not change their current board entry.'}
                                </p>
                                {preview.affectedLeaderboards.map((lb) => (
                                    <div
                                        key={`${lb.categoryId}:${lb.subcategoryKey}`}
                                        className="mb-2"
                                    >
                                        {lb.rankChanges.length > 0 && (
                                            <table className="table table-sm align-middle mb-0">
                                                <thead>
                                                    <tr>
                                                        <th>Runner</th>
                                                        <th className="text-end">
                                                            Rank
                                                        </th>
                                                        <th className="text-end">
                                                            Time
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
                                                                    {rc.currentRank ??
                                                                        '—'}
                                                                    {' → '}
                                                                    {rc.newRank ??
                                                                        '—'}
                                                                </td>
                                                                <td className="text-end">
                                                                    {rc.timeMs !=
                                                                    null ? (
                                                                        <DurationToFormatted
                                                                            duration={
                                                                                rc.timeMs
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
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-3">
                            <label
                                htmlFor="mt-reason"
                                className="form-label small text-muted mb-1"
                            >
                                Reason — required, min {MIN_REASON} characters,
                                audit-logged
                            </label>
                            <textarea
                                id="mt-reason"
                                className="form-control form-control-sm"
                                rows={2}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={isSaving}
                            />
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
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={handleSave}
                            disabled={busy || !timeValid || !reasonOk}
                        >
                            {isSaving
                                ? 'Saving…'
                                : isEdit
                                  ? 'Save changes'
                                  : 'Set time'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
