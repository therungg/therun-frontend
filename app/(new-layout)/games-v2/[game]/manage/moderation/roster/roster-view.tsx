'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    LeaderboardRosterRow,
    RosterFilter,
} from '../../../../../../../types/moderation.types';
import { ExcludeDialog } from '../shared/exclude-dialog';
import { IncludeDialog } from '../shared/include-dialog';
import { loadRosterAction } from './actions/load-roster.action';

type VerificationFilter = 'any' | 'unverified' | 'verified' | 'rejected';
type VodFilter = 'any' | 'true' | 'false';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    categories: Array<{ id: number; display: string }>;
    initialCategoryId: number | null;
}

export function RosterView({
    gameSlug,
    gameDisplay,
    categories,
    initialCategoryId,
}: Props) {
    const router = useRouter();
    const baseHref = `/games-v2/${gameSlug}/manage/moderation`;

    const [categoryId, setCategoryId] = useState<number | null>(
        initialCategoryId,
    );
    const [subcategoryKey, setSubcategoryKey] = useState('');
    const [verificationStatus, setVerificationStatus] =
        useState<VerificationFilter>('any');
    const [hasVod, setHasVod] = useState<VodFilter>('any');
    const [runnerName, setRunnerName] = useState('');

    const [rows, setRows] = useState<LeaderboardRosterRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [dialog, setDialog] = useState<'exclude' | 'include' | null>(null);
    const [isLoading, startLoad] = useTransition();

    const selectedRunIds = useMemo(() => Array.from(selected), [selected]);

    // If every selected run belongs to the same registered user, hint that a
    // standing user-exclusion rule may be a better fit than excluding runs.
    const ruleHint = useMemo(() => {
        if (!rows || selected.size < 2) return undefined;
        const picked = rows.filter((r) => selected.has(r.runId));
        const first = picked[0]?.userId;
        if (first == null) return undefined;
        const allSameUser = picked.every((r) => r.userId === first);
        if (!allSameUser) return undefined;
        const name = picked[0]?.runnerName ?? 'this user';
        return `All ${picked.length} selected runs belong to ${name}. Consider excluding the user from a runner page instead, to also cover future runs.`;
    }, [rows, selected]);

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

    const allSelected =
        rows != null && rows.length > 0 && selected.size === rows.length;

    const toggleAll = () => {
        if (!rows) return;
        setSelected(
            allSelected ? new Set() : new Set(rows.map((r) => r.runId)),
        );
    };

    const toggleRow = (runId: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(runId)) next.delete(runId);
            else next.add(runId);
            return next;
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
                    <div className="col-md-3">
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
                        {isLoading ? 'Loading…' : 'Load'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {rows != null && (
                <>
                    {rows.length === 0 ? (
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
                                    {rows.map((row) => {
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
                                                    {(row.isLeaderboardEntry ||
                                                        row.isLeaderboardEntryGt) && (
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
                                                    {!isGuest &&
                                                        row.userId != null && (
                                                            <Link
                                                                href={`${baseHref}/runner/${row.userId}`}
                                                                className="btn btn-sm btn-outline-secondary"
                                                            >
                                                                View runner
                                                            </Link>
                                                        )}
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
                    className="border-top bg-body shadow-lg p-2 d-flex align-items-center gap-2"
                    style={{
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 1020,
                    }}
                >
                    <span className="fw-bold">{selected.size} selected</span>
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
                            className="btn btn-sm btn-primary"
                            onClick={() => setDialog('include')}
                        >
                            Include selected
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => setDialog('exclude')}
                        >
                            Exclude selected
                        </button>
                    </div>
                </div>
            )}

            {dialog === 'exclude' && (
                <ExcludeDialog
                    gameSlug={gameSlug}
                    target={{ runIds: selectedRunIds }}
                    ruleHint={ruleHint}
                    onDone={afterMutation}
                    onClose={() => setDialog(null)}
                />
            )}
            {dialog === 'include' && (
                <IncludeDialog
                    gameSlug={gameSlug}
                    runIds={selectedRunIds}
                    onDone={afterMutation}
                    onClose={() => setDialog(null)}
                />
            )}
        </div>
    );
}
