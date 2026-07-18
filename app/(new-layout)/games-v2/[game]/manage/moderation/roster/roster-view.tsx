'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    LeaderboardRosterRow,
    RosterFilter,
} from '../../../../../../../types/moderation.types';
import type { ModVerb, RunActionTarget } from '../shared/action-model';
import { ManualTimeDialog } from '../shared/manual-time-dialog';
import { RunActionDialog } from '../shared/run-action-dialog';
import { loadRosterAction } from './actions/load-roster.action';

type VerificationFilter = 'any' | 'unverified' | 'verified' | 'rejected';
type VodFilter = 'any' | 'true' | 'false';
type BoardFilter = 'any' | 'on' | 'off';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    categories: Array<{ id: number; display: string }>;
    initialCategoryId: number | null;
}

/** Whether a roster row currently appears on either board (RT or GT). */
function isOnBoard(row: LeaderboardRosterRow): boolean {
    return row.isLeaderboardEntry || row.isLeaderboardEntryGt;
}

export function RosterView({
    gameSlug,
    gameDisplay,
    categories,
    initialCategoryId,
}: Props) {
    const router = useRouter();
    const baseHref = `/games-v2/${gameSlug}/manage/moderation`;
    const consoleHref = `/games-v2/${gameSlug}/manage?pane=attention`;

    const [categoryId, setCategoryId] = useState<number | null>(
        initialCategoryId,
    );
    const [subcategoryKey, setSubcategoryKey] = useState('');
    const [verificationStatus, setVerificationStatus] =
        useState<VerificationFilter>('any');
    const [hasVod, setHasVod] = useState<VodFilter>('any');
    const [onBoard, setOnBoard] = useState<BoardFilter>('any');
    const [runnerName, setRunnerName] = useState('');

    const [rows, setRows] = useState<LeaderboardRosterRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [dialog, setDialog] = useState<
        | { kind: 'action'; verb: ModVerb; target: RunActionTarget }
        | { kind: 'manual'; row: LeaderboardRosterRow }
        | null
    >(null);
    const [isLoading, startLoad] = useTransition();

    const selectedRunIds = useMemo(() => Array.from(selected), [selected]);

    // "On board" is a client-side filter — the backend roster endpoint has no
    // such query param. Account-age and faster-than-WR% filters are NOT added
    // because LeaderboardRosterRow carries neither field (backend ask, spec §13).
    const visibleRows = useMemo(() => {
        if (!rows) return rows;
        if (onBoard === 'any') return rows;
        return rows.filter((r) =>
            onBoard === 'on' ? isOnBoard(r) : !isOnBoard(r),
        );
    }, [rows, onBoard]);

    // If every selected run belongs to the same registered user, surface a ban
    // affordance: a standing user-exclusion rule covers future runs too.
    const banSubject = useMemo(() => {
        if (!rows || selected.size < 2) return null;
        const picked = rows.filter((r) => selected.has(r.runId));
        const first = picked[0]?.userId;
        if (first == null) return null;
        const allSameUser = picked.every((r) => r.userId === first);
        if (!allSameUser) return null;
        return {
            userId: first,
            runnerName: picked[0]?.runnerName ?? 'this runner',
            count: picked.length,
        };
    }, [rows, selected]);

    const categoryDisplay =
        categories.find((c) => c.id === categoryId)?.display ?? 'this category';

    const handleLoad = () => {
        if (categoryId == null) return;
        setError(null);
        setSelected(new Set());
        const filter: RosterFilter = {
            subcategoryKey: subcategoryKey.trim() || undefined,
            verificationStatus:
                verificationStatus === 'any' ? undefined : verificationStatus,
            hasVod: hasVod === 'any' ? undefined : hasVod === 'true',
            runnerName: runnerName.trim() || undefined,
        };
        startLoad(async () => {
            const res = await loadRosterAction(gameSlug, categoryId, filter);
            if ('error' in res) {
                setError(res.error);
                setRows(null);
                return;
            }
            setRows(res.rows);
        });
    };

    // Auto-load on mount for the selected category, and re-query whenever a
    // query-affecting filter changes ("On board" is excluded — it's a
    // client-only filter over already-loaded rows, no round trip needed).
    // Debounced uniformly, including the selects, so text typing doesn't
    // fire a request per keystroke.
    useEffect(() => {
        if (categoryId == null) return;
        const timer = setTimeout(() => {
            handleLoad();
        }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryId, subcategoryKey, verificationStatus, hasVod, runnerName]);

    const allSelected =
        visibleRows != null &&
        visibleRows.length > 0 &&
        visibleRows.every((r) => selected.has(r.runId));

    const toggleAll = () => {
        if (!visibleRows) return;
        if (allSelected) {
            setSelected((prev) => {
                const next = new Set(prev);
                for (const r of visibleRows) next.delete(r.runId);
                return next;
            });
        } else {
            setSelected((prev) => {
                const next = new Set(prev);
                for (const r of visibleRows) next.add(r.runId);
                return next;
            });
        }
    };

    const toggleRow = (runId: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(runId)) next.delete(runId);
            else next.add(runId);
            return next;
        });
    };

    const openRunsAction = (verb: ModVerb) => {
        if (selectedRunIds.length === 0) return;
        setDialog({
            kind: 'action',
            verb,
            target: {
                kind: 'runs',
                runIds: selectedRunIds,
                label: `${selectedRunIds.length} runs`,
            },
        });
    };

    const openBan = () => {
        if (!banSubject || categoryId == null) return;
        setDialog({
            kind: 'action',
            verb: 'ban',
            target: {
                kind: 'runner',
                runnerId: banSubject.userId,
                runnerName: banSubject.runnerName,
                categoryId,
                categoryDisplay,
                gameDisplay,
            },
        });
    };

    const afterMutation = () => {
        setDialog(null);
        setSelected(new Set());
        handleLoad();
    };

    return (
        <div className="container py-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h1 className="h4 mb-0">Roster — {gameDisplay}</h1>
                <Link
                    href={consoleHref}
                    className="btn btn-sm btn-outline-secondary"
                >
                    Back to console
                </Link>
            </div>

            <div className="border rounded p-3 mb-3">
                <div className="row g-2 align-items-end">
                    <div className="col-md-3">
                        <label
                            htmlFor="roster-category"
                            className="form-label small text-muted mb-1"
                        >
                            Category
                        </label>
                        <select
                            id="roster-category"
                            className="form-select form-select-sm"
                            value={categoryId ?? ''}
                            onChange={(e) => {
                                const id = Number.parseInt(e.target.value, 10);
                                setCategoryId(Number.isFinite(id) ? id : null);
                                if (Number.isFinite(id)) {
                                    router.replace(
                                        `${baseHref}/roster?categoryId=${id}`,
                                    );
                                }
                            }}
                        >
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.display}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label
                            htmlFor="roster-subkey"
                            className="form-label small text-muted mb-1"
                        >
                            Subcategory key
                        </label>
                        <input
                            id="roster-subkey"
                            type="text"
                            className="form-control form-control-sm"
                            value={subcategoryKey}
                            onChange={(e) => setSubcategoryKey(e.target.value)}
                            placeholder="(any)"
                        />
                    </div>
                    <div className="col-md-2">
                        <label
                            htmlFor="roster-verification"
                            className="form-label small text-muted mb-1"
                        >
                            Verification
                        </label>
                        <select
                            id="roster-verification"
                            className="form-select form-select-sm"
                            value={verificationStatus}
                            onChange={(e) =>
                                setVerificationStatus(
                                    e.target.value as VerificationFilter,
                                )
                            }
                        >
                            <option value="any">Any</option>
                            <option value="unverified">Unverified</option>
                            <option value="verified">Verified</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div className="col-md-1">
                        <label
                            htmlFor="roster-vod"
                            className="form-label small text-muted mb-1"
                        >
                            VOD
                        </label>
                        <select
                            id="roster-vod"
                            className="form-select form-select-sm"
                            value={hasVod}
                            onChange={(e) =>
                                setHasVod(e.target.value as VodFilter)
                            }
                        >
                            <option value="any">Any</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label
                            htmlFor="roster-board"
                            className="form-label small text-muted mb-1"
                        >
                            On board
                        </label>
                        <select
                            id="roster-board"
                            className="form-select form-select-sm"
                            value={onBoard}
                            onChange={(e) =>
                                setOnBoard(e.target.value as BoardFilter)
                            }
                        >
                            <option value="any">Any</option>
                            <option value="on">On board</option>
                            <option value="off">Off board</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label
                            htmlFor="roster-runner"
                            className="form-label small text-muted mb-1"
                        >
                            Runner name
                        </label>
                        <input
                            id="roster-runner"
                            type="text"
                            className="form-control form-control-sm"
                            value={runnerName}
                            onChange={(e) => setRunnerName(e.target.value)}
                            placeholder="(any)"
                        />
                    </div>
                </div>
                <div className="d-flex justify-content-end mt-2">
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={handleLoad}
                        disabled={isLoading || categoryId == null}
                    >
                        {isLoading ? 'Loading…' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {visibleRows != null && (
                <>
                    {visibleRows.length === 0 ? (
                        <p className="text-muted">
                            No runs match these filters.
                        </p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-sm table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th style={{ width: '1%' }}>
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                aria-label="Select all"
                                                checked={allSelected}
                                                onChange={toggleAll}
                                            />
                                        </th>
                                        <th>Runner</th>
                                        <th>Subcategory</th>
                                        <th className="text-end">RT</th>
                                        <th className="text-end">GT</th>
                                        <th className="text-center">
                                            Verified
                                        </th>
                                        <th className="text-center">VOD</th>
                                        <th className="text-center">Board</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleRows.map((row) => {
                                        const isGuest = row.userId == null;
                                        return (
                                            <tr key={row.runId}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        aria-label={`Select run ${row.runId}`}
                                                        checked={selected.has(
                                                            row.runId,
                                                        )}
                                                        onChange={() =>
                                                            toggleRow(row.runId)
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    {isGuest ? (
                                                        <span>
                                                            {row.runnerName}{' '}
                                                            <span className="badge text-bg-secondary">
                                                                guest
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <UserLink
                                                            username={
                                                                row.runnerName
                                                            }
                                                        />
                                                    )}
                                                </td>
                                                <td className="small text-muted">
                                                    {row.subcategoryKey || '—'}
                                                </td>
                                                <td className="text-end">
                                                    {row.time != null ? (
                                                        <DurationToFormatted
                                                            duration={row.time}
                                                        />
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="text-end">
                                                    {row.gameTime != null ? (
                                                        <DurationToFormatted
                                                            duration={
                                                                row.gameTime
                                                            }
                                                        />
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    {row.verificationStatus ===
                                                    'verified'
                                                        ? '✓'
                                                        : ''}
                                                </td>
                                                <td className="text-center">
                                                    {row.vodUrl ? (
                                                        <a
                                                            href={row.vodUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            Link
                                                        </a>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    {isOnBoard(row) && (
                                                        <span
                                                            className="badge text-bg-success"
                                                            title={`On board${
                                                                row.isLeaderboardEntry
                                                                    ? ' RT'
                                                                    : ''
                                                            }${
                                                                row.isLeaderboardEntryGt
                                                                    ? ' GT'
                                                                    : ''
                                                            }`}
                                                        >
                                                            On board
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-end">
                                                    <div className="d-flex gap-1 justify-content-end">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() =>
                                                                setDialog({
                                                                    kind: 'manual',
                                                                    row,
                                                                })
                                                            }
                                                        >
                                                            Set time
                                                        </button>
                                                        {!isGuest &&
                                                            row.userId !=
                                                                null && (
                                                                <Link
                                                                    href={`${baseHref}/runner/${row.userId}`}
                                                                    className="btn btn-sm btn-outline-secondary"
                                                                >
                                                                    View runner
                                                                </Link>
                                                            )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {selected.size > 0 && (
                <div
                    className="border-top bg-body shadow-lg p-2 d-flex flex-wrap align-items-center gap-2"
                    style={{
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 1020,
                    }}
                >
                    <span className="fw-bold">{selected.size} selected</span>
                    {banSubject && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={openBan}
                        >
                            Ban {banSubject.runnerName} instead…
                        </button>
                    )}
                    <div className="ms-auto d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setSelected(new Set())}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() => openRunsAction('approve')}
                        >
                            Approve
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => openRunsAction('remove')}
                        >
                            Remove…
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => openRunsAction('restore')}
                        >
                            Restore
                        </button>
                    </div>
                </div>
            )}

            {dialog?.kind === 'action' && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb={dialog.verb}
                    target={dialog.target}
                    defaultBanScope={
                        dialog.verb === 'ban' ? 'category' : undefined
                    }
                    onDone={afterMutation}
                    onClose={() => setDialog(null)}
                />
            )}
            {dialog?.kind === 'manual' && categoryId != null && (
                <ManualTimeDialog
                    gameSlug={gameSlug}
                    runnerRef={
                        dialog.row.userId != null
                            ? { userId: dialog.row.userId }
                            : { guestName: dialog.row.runnerName }
                    }
                    runnerLabel={dialog.row.runnerName}
                    categoryId={categoryId}
                    categoryLabel={categoryDisplay}
                    subcategoryKey={dialog.row.subcategoryKey}
                    onDone={() => {
                        setDialog(null);
                        handleLoad();
                    }}
                    onClose={() => setDialog(null)}
                />
            )}
        </div>
    );
}
