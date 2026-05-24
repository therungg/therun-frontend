'use client';

import moment from 'moment/moment';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    FlagSeverity,
    QueueItem,
    SuggestedAction,
} from '../../../../../../../types/moderation.types';
import {
    loadQueueAction,
    quickExcludeAction,
    quickVerdictAction,
    resolveFlagAction,
} from './actions/queue-actions.action';

type SeverityFilter = 'any' | FlagSeverity;

const MIN_REASON = 10;

interface Props {
    gameSlug: string;
    gameDisplay: string;
    items: QueueItem[];
    categories: Array<{ id: number; display: string }>;
}

/** Which mutating action a queued item's reason dialog will perform. */
type PendingAction =
    | { kind: 'resolve'; flagId: number }
    | { kind: 'reject'; runId: number }
    | { kind: 'exclude'; runId: number }
    | { kind: 'verify'; runId: number };

const SEVERITY_BADGE: Record<FlagSeverity, string> = {
    high: 'text-bg-danger',
    medium: 'text-bg-warning',
    low: 'text-bg-secondary',
};

function itemKey(item: QueueItem): string {
    return item.flagId != null
        ? `flag:${item.flagId}`
        : `run:${item.run.runId}:${item.reason}`;
}

function summarizeDetails(details: Record<string, unknown>): string {
    const entries = Object.entries(details);
    if (entries.length === 0) return '';
    return entries
        .map(([k, v]) => {
            const val =
                v != null && typeof v === 'object'
                    ? JSON.stringify(v)
                    : String(v);
            return `${k}: ${val}`;
        })
        .join(' · ');
}

export function QueueView({
    gameSlug,
    gameDisplay,
    items: initialItems,
    categories,
}: Props) {
    const baseHref = `/games-v2/${gameSlug}/manage/moderation`;

    const [items, setItems] = useState<QueueItem[]>(initialItems);
    const [reason, setReason] = useState('');
    const [severity, setSeverity] = useState<SeverityFilter>('any');
    const [categoryId, setCategoryId] = useState<number | 'any'>('any');

    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [isLoading, startLoad] = useTransition();

    const handleRefresh = () => {
        setError(null);
        startLoad(async () => {
            const res = await loadQueueAction(gameSlug, {
                reason: reason.trim() || undefined,
                severity: severity === 'any' ? undefined : severity,
                categoryId: categoryId === 'any' ? undefined : categoryId,
                limit: 100,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setItems(res.items);
        });
    };

    const removeByKey = (key: string) => {
        setItems((prev) => prev.filter((it) => itemKey(it) !== key));
    };

    return (
        <div className="container py-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h1 className="h4 mb-0">Triage queue — {gameDisplay}</h1>
                <Link
                    href={baseHref}
                    className="btn btn-sm btn-outline-secondary"
                >
                    Back to moderation
                </Link>
            </div>

            <div className="border rounded p-3 mb-3">
                <div className="row g-2 align-items-end">
                    <div className="col-md-4">
                        <label
                            htmlFor="queue-reason"
                            className="form-label small text-muted mb-1"
                        >
                            Reason
                        </label>
                        <input
                            id="queue-reason"
                            type="text"
                            className="form-control form-control-sm"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="(any)"
                        />
                    </div>
                    <div className="col-md-3">
                        <label
                            htmlFor="queue-severity"
                            className="form-label small text-muted mb-1"
                        >
                            Severity
                        </label>
                        <select
                            id="queue-severity"
                            className="form-select form-select-sm"
                            value={severity}
                            onChange={(e) =>
                                setSeverity(e.target.value as SeverityFilter)
                            }
                        >
                            <option value="any">Any</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label
                            htmlFor="queue-category"
                            className="form-label small text-muted mb-1"
                        >
                            Category
                        </label>
                        <select
                            id="queue-category"
                            className="form-select form-select-sm"
                            value={categoryId === 'any' ? '' : categoryId}
                            onChange={(e) => {
                                const v = e.target.value;
                                setCategoryId(
                                    v === '' ? 'any' : Number.parseInt(v, 10),
                                );
                            }}
                        >
                            <option value="">Any</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.display}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2 d-flex justify-content-end">
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={handleRefresh}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Refreshing…' : 'Refresh'}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {items.length === 0 ? (
                <p className="text-muted">The triage queue is empty.</p>
            ) : (
                <div className="d-flex flex-column gap-2">
                    {items.map((item) => (
                        <QueueCard
                            key={itemKey(item)}
                            item={item}
                            baseHref={baseHref}
                            onResolve={() =>
                                item.flagId != null &&
                                setPending({
                                    kind: 'resolve',
                                    flagId: item.flagId,
                                })
                            }
                            onReject={() =>
                                setPending({
                                    kind: 'reject',
                                    runId: item.run.runId,
                                })
                            }
                            onExclude={() =>
                                setPending({
                                    kind: 'exclude',
                                    runId: item.run.runId,
                                })
                            }
                            onVerify={() =>
                                setPending({
                                    kind: 'verify',
                                    runId: item.run.runId,
                                })
                            }
                        />
                    ))}
                </div>
            )}

            {pending && (
                <ReasonDialog
                    pending={pending}
                    gameSlug={gameSlug}
                    onClose={() => setPending(null)}
                    onDone={(removedKey) => {
                        removeByKey(removedKey);
                        setPending(null);
                    }}
                    items={items}
                />
            )}
        </div>
    );
}

interface QueueCardProps {
    item: QueueItem;
    baseHref: string;
    onResolve: () => void;
    onReject: () => void;
    onExclude: () => void;
    onVerify: () => void;
}

function QueueCard({
    item,
    baseHref,
    onResolve,
    onReject,
    onExclude,
    onVerify,
}: QueueCardProps) {
    const { run, suggestedAction } = item;
    const isGuest = run.userId == null;
    const details = summarizeDetails(item.details);

    const isSuggested = (a: SuggestedAction) => suggestedAction === a;

    return (
        <div className="border rounded p-3">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className={`badge ${SEVERITY_BADGE[item.severity]}`}>
                    {item.severity}
                </span>
                <strong>{item.reason}</strong>
                <span className="text-muted small ms-auto">
                    <abbr title={moment(item.createdAt).format('LLLL')}>
                        {moment(item.createdAt).fromNow()}
                    </abbr>
                </span>
            </div>

            <div className="small mb-2">
                <span className="me-3">
                    {isGuest ? (
                        <span>
                            {run.runnerName}{' '}
                            <span className="badge text-bg-secondary">
                                guest
                            </span>
                        </span>
                    ) : (
                        <UserLink username={run.runnerName} />
                    )}
                </span>
                <span className="text-muted me-3">{run.categoryName}</span>
                {run.subcategoryKey && (
                    <span className="text-muted me-3">
                        {run.subcategoryKey}
                    </span>
                )}
                <span className="me-3">
                    RT <DurationToFormatted duration={run.timeMs} />
                </span>
                {run.gameTimeMs != null && (
                    <span className="me-3">
                        GT <DurationToFormatted duration={run.gameTimeMs} />
                    </span>
                )}
                {run.vodUrl ? (
                    <a
                        className="me-3"
                        href={run.vodUrl}
                        target="_blank"
                        rel="noreferrer"
                    >
                        VOD
                    </a>
                ) : (
                    <span className="text-muted me-3">No VOD</span>
                )}
                <span className="text-muted">{run.verificationStatus}</span>
            </div>

            {details && <div className="small text-muted mb-2">{details}</div>}

            <div className="d-flex flex-wrap gap-2">
                <button
                    type="button"
                    className={`btn btn-sm ${
                        isSuggested('none')
                            ? 'btn-primary'
                            : 'btn-outline-secondary'
                    }`}
                    onClick={onResolve}
                    disabled={item.flagId == null}
                    title={
                        item.flagId == null
                            ? 'Derived item — no flag to resolve'
                            : undefined
                    }
                >
                    Resolve
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${
                        isSuggested('reject')
                            ? 'btn-danger'
                            : 'btn-outline-danger'
                    }`}
                    onClick={onReject}
                >
                    Reject run
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${
                        isSuggested('exclude')
                            ? 'btn-danger'
                            : 'btn-outline-danger'
                    }`}
                    onClick={onExclude}
                >
                    Exclude run
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${
                        isSuggested('verify')
                            ? 'btn-success'
                            : 'btn-outline-success'
                    }`}
                    onClick={onVerify}
                >
                    Verify run
                </button>
                {!isGuest && run.userId != null && (
                    <Link
                        href={`${baseHref}/runner/${run.userId}`}
                        className="btn btn-sm btn-outline-secondary ms-auto"
                    >
                        View runner
                    </Link>
                )}
            </div>
        </div>
    );
}

const ACTION_LABEL: Record<PendingAction['kind'], string> = {
    resolve: 'Resolve flag',
    reject: 'Reject run',
    exclude: 'Exclude run',
    verify: 'Verify run',
};

interface ReasonDialogProps {
    pending: PendingAction;
    gameSlug: string;
    items: QueueItem[];
    onClose: () => void;
    onDone: (removedKey: string) => void;
}

function ReasonDialog({
    pending,
    gameSlug,
    items,
    onClose,
    onDone,
}: ReasonDialogProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isConfirming, startConfirm] = useTransition();

    const reasonOk = reason.trim().length >= MIN_REASON;

    // The queue item this dialog targets, so we can remove the right row after.
    const targetKey =
        pending.kind === 'resolve'
            ? items.find((it) => it.flagId === pending.flagId)
            : items.find((it) => it.run.runId === pending.runId);

    const handleConfirm = () => {
        if (!reasonOk) return;
        setError(null);
        const trimmed = reason.trim();
        startConfirm(async () => {
            let res: { ok: true } | { error: string };
            if (pending.kind === 'resolve') {
                res = await resolveFlagAction(
                    gameSlug,
                    pending.flagId,
                    trimmed,
                );
            } else if (pending.kind === 'exclude') {
                res = await quickExcludeAction(
                    gameSlug,
                    pending.runId,
                    trimmed,
                );
            } else {
                res = await quickVerdictAction(
                    gameSlug,
                    pending.runId,
                    pending.kind === 'reject' ? 'reject' : 'verify',
                    trimmed,
                );
            }

            if ('error' in res) {
                setError(res.error);
                return;
            }

            toast.success(`${ACTION_LABEL[pending.kind]} — done.`);
            onDone(targetKey ? itemKey(targetKey) : '');
        });
    };

    return (
        <div
            className="modal d-block"
            tabIndex={-1}
            role="dialog"
            style={{ background: 'rgba(0,0,0,0.5)' }}
        >
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {ACTION_LABEL[pending.kind]}
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
                        <label
                            htmlFor="queue-action-reason"
                            className="form-label small text-muted mb-1"
                        >
                            Reason — required, min {MIN_REASON} characters,
                            audit-logged
                        </label>
                        <textarea
                            id="queue-action-reason"
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
                            className="btn btn-sm btn-primary"
                            onClick={handleConfirm}
                            disabled={isConfirming || !reasonOk}
                        >
                            {isConfirming
                                ? 'Working…'
                                : ACTION_LABEL[pending.kind]}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
