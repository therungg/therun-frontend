'use client';

import moment from 'moment';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    ManualTimeRow,
    RunnerRef,
} from '../../../../../../../types/moderation.types';
import {
    deleteManualTimeAction,
    listManualTimesAction,
    manualTimeVerdictAction,
} from '../shared/actions/manual-times.action';
import { ManualTimeDialog } from '../shared/manual-time-dialog';
import { ReasonModal } from '../shared/reason-modal';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    rows: ManualTimeRow[];
    categories: Array<{ id: number; display: string }>;
}

type ActiveAction =
    | { kind: 'edit'; row: ManualTimeRow }
    | { kind: 'delete'; row: ManualTimeRow }
    | { kind: 'verify'; row: ManualTimeRow }
    | { kind: 'reject'; row: ManualTimeRow }
    | null;

function statusBadge(status: ManualTimeRow['verificationStatus']) {
    const cls =
        status === 'verified'
            ? 'text-bg-success'
            : status === 'pending'
              ? 'text-bg-warning'
              : 'text-bg-secondary';
    return <span className={`badge ${cls}`}>{status}</span>;
}

export function ManualTimesView({
    gameSlug,
    gameDisplay,
    rows: initial,
    categories,
}: Props) {
    const baseHref = `/games-v2/${gameSlug}/manage/moderation`;
    const [rows, setRows] = useState<ManualTimeRow[]>(initial);
    const [pendingOnly, setPendingOnly] = useState(false);
    const [active, setActive] = useState<ActiveAction>(null);
    const [, startRefresh] = useTransition();

    const catName = useMemo(() => {
        const m = new Map(categories.map((c) => [c.id, c.display]));
        return (id: number) => m.get(id) ?? `Category #${id}`;
    }, [categories]);

    const visible = pendingOnly
        ? rows.filter((r) => r.verificationStatus === 'pending')
        : rows;

    const pendingCount = rows.filter(
        (r) => r.verificationStatus === 'pending',
    ).length;

    const refresh = () =>
        startRefresh(async () => {
            const res = await listManualTimesAction(gameSlug);
            if ('ok' in res) setRows(res.rows);
        });

    const runnerRefOf = (r: ManualTimeRow): RunnerRef =>
        r.userId != null
            ? { userId: r.userId }
            : { guestName: r.guestName ?? r.runnerName };

    const onVerdict = async (
        row: ManualTimeRow,
        act: 'verify' | 'reject',
        reason: string,
    ) => {
        const res = await manualTimeVerdictAction(
            gameSlug,
            row.id,
            act,
            reason,
        );
        if ('error' in res) {
            toast.error(res.error);
            return;
        }
        toast.success(
            act === 'verify'
                ? 'Manual time verified.'
                : 'Manual time rejected.',
        );
        setActive(null);
        refresh();
    };

    const onDelete = async (row: ManualTimeRow, reason: string) => {
        const res = await deleteManualTimeAction(gameSlug, row.id, reason);
        if ('error' in res) {
            toast.error(res.error);
            return;
        }
        toast.success('Manual time deleted.');
        setActive(null);
        refresh();
    };

    return (
        <div className="container py-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h1 className="h4 mb-0">Manual times — {gameDisplay}</h1>
                <Link
                    href={baseHref}
                    className="btn btn-sm btn-outline-secondary"
                >
                    Back to moderation
                </Link>
            </div>

            <p className="text-muted small">
                Mod- and self-asserted leaderboard times. Set new times from a{' '}
                <Link href={`${baseHref}/roster`}>roster</Link> or runner page.
                Pending entries are usually self-claims awaiting review.
            </p>

            <div className="form-check mb-2">
                <input
                    id="mt-pending-only"
                    type="checkbox"
                    className="form-check-input"
                    checked={pendingOnly}
                    onChange={(e) => setPendingOnly(e.target.checked)}
                />
                <label
                    className="form-check-label small"
                    htmlFor="mt-pending-only"
                >
                    Pending only{pendingCount > 0 ? ` (${pendingCount})` : ''}
                </label>
            </div>

            {visible.length === 0 ? (
                <p className="text-muted">No manual times.</p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle">
                        <thead>
                            <tr>
                                <th>Runner</th>
                                <th>Board</th>
                                <th>Timing</th>
                                <th className="text-end">Time</th>
                                <th>Status</th>
                                <th>Source</th>
                                <th>Set by</th>
                                <th>When</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((r) => (
                                <tr key={r.id}>
                                    <td>
                                        {r.userId != null ? (
                                            <UserLink username={r.runnerName} />
                                        ) : (
                                            <span>
                                                {r.runnerName}{' '}
                                                <span className="badge text-bg-secondary">
                                                    guest
                                                </span>
                                            </span>
                                        )}
                                    </td>
                                    <td className="small">
                                        {catName(r.categoryId)}
                                        {r.subcategoryKey ? (
                                            <span className="text-muted">
                                                {' '}
                                                · {r.subcategoryKey}
                                            </span>
                                        ) : null}
                                    </td>
                                    <td className="small">
                                        {r.timing === 'gametime' ? 'GT' : 'RT'}
                                    </td>
                                    <td className="text-end">
                                        <DurationToFormatted
                                            duration={r.timeMs}
                                        />
                                    </td>
                                    <td>{statusBadge(r.verificationStatus)}</td>
                                    <td className="small">
                                        {r.source}
                                        {r.evidenceUrl ? (
                                            <>
                                                {' · '}
                                                <a
                                                    href={r.evidenceUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    evidence
                                                </a>
                                            </>
                                        ) : null}
                                    </td>
                                    <td
                                        className="small text-muted"
                                        title={r.reason}
                                    >
                                        {r.createdByName || `#${r.createdBy}`}
                                    </td>
                                    <td className="small text-muted">
                                        {moment(r.createdAt).fromNow()}
                                    </td>
                                    <td className="text-end">
                                        <div className="d-flex gap-1 justify-content-end">
                                            {r.verificationStatus ===
                                                'pending' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-success"
                                                        onClick={() =>
                                                            setActive({
                                                                kind: 'verify',
                                                                row: r,
                                                            })
                                                        }
                                                    >
                                                        Verify
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-warning"
                                                        onClick={() =>
                                                            setActive({
                                                                kind: 'reject',
                                                                row: r,
                                                            })
                                                        }
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={() =>
                                                    setActive({
                                                        kind: 'edit',
                                                        row: r,
                                                    })
                                                }
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() =>
                                                    setActive({
                                                        kind: 'delete',
                                                        row: r,
                                                    })
                                                }
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {active?.kind === 'edit' && (
                <ManualTimeDialog
                    gameSlug={gameSlug}
                    runnerRef={runnerRefOf(active.row)}
                    runnerLabel={active.row.runnerName}
                    categoryId={active.row.categoryId}
                    categoryLabel={catName(active.row.categoryId)}
                    subcategoryKey={active.row.subcategoryKey}
                    existing={active.row}
                    onDone={() => {
                        setActive(null);
                        refresh();
                    }}
                    onClose={() => setActive(null)}
                />
            )}
            {active?.kind === 'delete' && (
                <ReasonModal
                    title="Delete manual time"
                    confirmLabel="Delete"
                    confirmVariant="danger"
                    onConfirm={(reason) => onDelete(active.row, reason)}
                    onClose={() => setActive(null)}
                />
            )}
            {active?.kind === 'verify' && (
                <ReasonModal
                    title="Verify manual time"
                    confirmLabel="Verify"
                    confirmVariant="success"
                    onConfirm={(reason) =>
                        onVerdict(active.row, 'verify', reason)
                    }
                    onClose={() => setActive(null)}
                />
            )}
            {active?.kind === 'reject' && (
                <ReasonModal
                    title="Reject manual time"
                    confirmLabel="Reject"
                    confirmVariant="danger"
                    onConfirm={(reason) =>
                        onVerdict(active.row, 'reject', reason)
                    }
                    onClose={() => setActive(null)}
                />
            )}
        </div>
    );
}
