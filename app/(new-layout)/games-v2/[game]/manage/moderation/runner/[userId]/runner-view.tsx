'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { UserEligibleRunRow } from '../../../../../../../../types/moderation.types';
import {
    normalizeVerificationStatus,
    VerificationBadge,
} from '../../../../run-view/run-badges';
import { BackLink } from '../../../../shared/back-link';
import type { ModVerb, RunActionTarget } from '../../shared/action-model';
import { ManualTimeDialog } from '../../shared/manual-time-dialog';
import { RunActionDialog } from '../../shared/run-action-dialog';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    userId: number;
    runnerName: string;
    rows: UserEligibleRunRow[];
}

interface Group {
    categoryId: number;
    categoryName: string;
    subKey: string;
    rows: UserEligibleRunRow[];
}

/** A run-action dialog invocation (kind:'runs' or kind:'runner' ban). */
type DialogState =
    | {
          kind: 'action';
          verb: ModVerb;
          target: RunActionTarget;
          banScope?: 'game';
      }
    | { kind: 'manual'; group: Group }
    | null;

function groupRows(rows: UserEligibleRunRow[]): Group[] {
    const map = new Map<string, Group>();
    for (const r of rows) {
        const key = `${r.categoryId}::${r.subcategoryKey}`;
        let g = map.get(key);
        if (!g) {
            g = {
                categoryId: r.categoryId,
                categoryName: r.categoryName,
                subKey: r.subcategoryKey,
                rows: [],
            };
            map.set(key, g);
        }
        g.rows.push(r);
    }
    return Array.from(map.values()).sort((a, b) =>
        a.categoryName === b.categoryName
            ? a.subKey.localeCompare(b.subKey)
            : a.categoryName.localeCompare(b.categoryName),
    );
}

export function RunnerView({
    gameSlug,
    gameDisplay,
    userId,
    runnerName,
    rows,
}: Props) {
    const router = useRouter();
    const consoleHref = `/games-v2/${gameSlug}/manage?pane=attention`;
    const groups = useMemo(() => groupRows(rows), [rows]);

    const distinctCategories = useMemo(() => {
        const m = new Map<number, string>();
        for (const r of rows) m.set(r.categoryId, r.categoryName);
        return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
    }, [rows]);

    const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [dialog, setDialog] = useState<DialogState>(null);

    const visibleGroups =
        categoryFilter === 'all'
            ? groups
            : groups.filter((g) => g.categoryId === categoryFilter);

    const selectedRunIds = useMemo(() => Array.from(selected), [selected]);

    // All visible rows (respects the category filter) — drives "Remove all".
    const visibleRunIds = useMemo(
        () => visibleGroups.flatMap((g) => g.rows.map((r) => r.runId)),
        [visibleGroups],
    );

    // For a ban target we need a category — use the first visible group's.
    const firstVisibleGroup = visibleGroups[0];

    const toggleRow = (runId: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(runId)) next.delete(runId);
            else next.add(runId);
            return next;
        });
    };

    const setMany = (ids: number[], on: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev);
            for (const id of ids) {
                if (on) next.add(id);
                else next.delete(id);
            }
            return next;
        });
    };

    const banTarget = (): RunActionTarget | null => {
        if (!firstVisibleGroup) return null;
        return {
            kind: 'runner',
            runnerId: userId,
            runnerName,
            categoryId: firstVisibleGroup.categoryId,
            categoryDisplay: firstVisibleGroup.categoryName,
            gameDisplay,
        };
    };

    const openBan = () => {
        const target = banTarget();
        if (!target) return;
        setDialog({ kind: 'action', verb: 'ban', target, banScope: 'game' });
    };

    const openRunsAction = (verb: ModVerb, runIds: number[], label: string) => {
        if (runIds.length === 0) return;
        setDialog({
            kind: 'action',
            verb,
            target: { kind: 'runs', runIds, label },
        });
    };

    const afterMutation = () => {
        setDialog(null);
        setSelected(new Set());
        // Rows came from the server; refresh to reflect the change.
        router.refresh();
    };

    const showBanNudge = selected.size >= 3;

    return (
        <div className="container py-3">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <h1 className="h4 mb-0">
                    {runnerName}{' '}
                    <span className="text-muted fs-6">in {gameDisplay}</span>
                </h1>
                <div className="d-flex flex-wrap gap-2">
                    {firstVisibleGroup && (
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={openBan}
                        >
                            Ban runner…
                        </button>
                    )}
                    {visibleRunIds.length > 0 && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                                openRunsAction(
                                    'remove',
                                    visibleRunIds,
                                    `all of ${runnerName}'s ${visibleRunIds.length} runs`,
                                )
                            }
                        >
                            Remove all {visibleRunIds.length} runs
                        </button>
                    )}
                    <BackLink href={consoleHref} label="Back to console" />
                </div>
            </div>

            {distinctCategories.length > 1 && (
                <div className="border rounded p-3 mb-3 d-flex flex-wrap align-items-end gap-2">
                    <div>
                        <label
                            htmlFor="runner-category"
                            className="form-label small text-muted mb-1"
                        >
                            Category filter
                        </label>
                        <select
                            id="runner-category"
                            className="form-select form-select-sm"
                            value={
                                categoryFilter === 'all' ? '' : categoryFilter
                            }
                            onChange={(e) => {
                                const v = e.target.value;
                                setCategoryFilter(
                                    v === '' ? 'all' : Number.parseInt(v, 10),
                                );
                            }}
                        >
                            <option value="">All categories</option>
                            {distinctCategories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {visibleGroups.length === 0 ? (
                <p className="text-muted">
                    No eligible runs for this runner in this game.
                </p>
            ) : (
                visibleGroups.map((g) => {
                    const groupIds = g.rows.map((r) => r.runId);
                    const groupAll = groupIds.every((id) => selected.has(id));
                    return (
                        <div
                            key={`${g.categoryId}::${g.subKey}`}
                            className="mb-3"
                        >
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    aria-label={`Select all in ${g.categoryName}`}
                                    checked={groupAll}
                                    onChange={() =>
                                        setMany(groupIds, !groupAll)
                                    }
                                />
                                <strong>{g.categoryName}</strong>
                                {g.subKey && (
                                    <span className="text-muted small">
                                        {g.subKey}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary ms-auto"
                                    onClick={() =>
                                        setDialog({ kind: 'manual', group: g })
                                    }
                                >
                                    Set time
                                </button>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-sm table-hover align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '1%' }} />
                                            <th className="text-end">RT</th>
                                            <th className="text-end">GT</th>
                                            <th className="text-center">
                                                Verified
                                            </th>
                                            <th className="text-center">VOD</th>
                                            <th className="text-end">Rank</th>
                                            <th className="text-center">
                                                Board
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {g.rows.map((r) => (
                                            <tr key={r.runId}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        aria-label={`Select run ${r.runId}`}
                                                        checked={selected.has(
                                                            r.runId,
                                                        )}
                                                        onChange={() =>
                                                            toggleRow(r.runId)
                                                        }
                                                    />
                                                </td>
                                                <td className="text-end">
                                                    {r.time != null ? (
                                                        <DurationToFormatted
                                                            duration={r.time}
                                                        />
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="text-end">
                                                    {r.gameTime != null ? (
                                                        <DurationToFormatted
                                                            duration={
                                                                r.gameTime
                                                            }
                                                        />
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <VerificationBadge
                                                        status={normalizeVerificationStatus(
                                                            r.verificationStatus,
                                                        )}
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    {r.vodUrl ? (
                                                        <a
                                                            href={r.vodUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            Link
                                                        </a>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="text-end">
                                                    {r.rank != null
                                                        ? `#${r.rank}${
                                                              r.totalRunners !=
                                                              null
                                                                  ? ` / ${r.totalRunners}`
                                                                  : ''
                                                          }`
                                                        : '—'}
                                                </td>
                                                <td className="text-center">
                                                    {(r.isLeaderboardEntry ||
                                                        r.isLeaderboardEntryGt) && (
                                                        <span
                                                            className="badge text-bg-success"
                                                            title={`On board${
                                                                r.isLeaderboardEntry
                                                                    ? ' RT'
                                                                    : ''
                                                            }${
                                                                r.isLeaderboardEntryGt
                                                                    ? ' GT'
                                                                    : ''
                                                            }`}
                                                        >
                                                            On board
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })
            )}

            {showBanNudge && (
                <div className="alert alert-info d-flex flex-wrap align-items-center gap-2 py-2">
                    <span className="mb-0">
                        Removing many of {runnerName}'s runs?{' '}
                        <strong>Banning {runnerName}</strong> also covers their
                        future uploads.
                    </span>
                    {firstVisibleGroup && (
                        <button
                            type="button"
                            className="btn btn-sm btn-danger ms-auto"
                            onClick={openBan}
                        >
                            Ban {runnerName} instead…
                        </button>
                    )}
                </div>
            )}

            {selected.size > 0 && (
                <div
                    className="border-top bg-body shadow-lg p-2 d-flex align-items-center gap-2"
                    style={{ position: 'sticky', bottom: 0, zIndex: 1020 }}
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
                            className="btn btn-sm btn-success"
                            onClick={() =>
                                openRunsAction(
                                    'approve',
                                    selectedRunIds,
                                    `${selectedRunIds.length} runs`,
                                )
                            }
                        >
                            Approve
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() =>
                                openRunsAction(
                                    'remove',
                                    selectedRunIds,
                                    `${selectedRunIds.length} runs`,
                                )
                            }
                        >
                            Remove…
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() =>
                                openRunsAction(
                                    'restore',
                                    selectedRunIds,
                                    `${selectedRunIds.length} runs`,
                                )
                            }
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
                    defaultBanScope={dialog.banScope}
                    onDone={afterMutation}
                    onClose={() => setDialog(null)}
                />
            )}
            {dialog?.kind === 'manual' && (
                <ManualTimeDialog
                    gameSlug={gameSlug}
                    runnerRef={{ userId }}
                    runnerLabel={runnerName}
                    categoryId={dialog.group.categoryId}
                    categoryLabel={dialog.group.categoryName}
                    subcategoryKey={dialog.group.subKey}
                    onDone={afterMutation}
                    onClose={() => setDialog(null)}
                />
            )}
        </div>
    );
}
