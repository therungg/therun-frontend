'use client';

import { useMemo, useState } from 'react';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { UserEligibleRunRow } from '../../../../../../../../types/moderation.types';
import type { ExcludeTarget } from '../../shared/actions/exclude.action';
import { ExcludeDialog } from '../../shared/exclude-dialog';
import { IncludeDialog } from '../../shared/include-dialog';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    userId: number;
    rows: UserEligibleRunRow[];
}

interface Group {
    categoryId: number;
    categoryName: string;
    subKey: string;
    rows: UserEligibleRunRow[];
}

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

export function RunnerView({ gameSlug, gameDisplay, userId, rows }: Props) {
    const baseHref = `/games-v2/${gameSlug}/manage/moderation`;
    const groups = useMemo(() => groupRows(rows), [rows]);

    const distinctCategories = useMemo(() => {
        const m = new Map<number, string>();
        for (const r of rows) m.set(r.categoryId, r.categoryName);
        return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
    }, [rows]);

    const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [dialog, setDialog] = useState<
        { kind: 'exclude'; target: ExcludeTarget } | { kind: 'include' } | null
    >(null);

    const visibleGroups =
        categoryFilter === 'all'
            ? groups
            : groups.filter((g) => g.categoryId === categoryFilter);

    const selectedRunIds = useMemo(() => Array.from(selected), [selected]);

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

    const afterMutation = () => {
        setDialog(null);
        // Rows came from the server; reload to reflect the change.
        window.location.reload();
    };

    return (
        <div className="container py-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h1 className="h4 mb-0">
                    Runner <span className="text-muted">#{userId}</span>{' '}
                    <span className="text-muted fs-6">in {gameDisplay}</span>
                </h1>
                <Link
                    href={baseHref}
                    className="btn btn-sm btn-outline-secondary"
                >
                    Back to moderation
                </Link>
            </div>

            <div className="border rounded p-3 mb-3 d-flex flex-wrap align-items-end gap-2">
                {distinctCategories.length > 1 && (
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
                )}
                <div className="ms-auto d-flex gap-2">
                    {categoryFilter !== 'all' && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                                setDialog({
                                    kind: 'exclude',
                                    target: {
                                        rule: {
                                            type: 'user',
                                            targetId: userId,
                                            categoryId: categoryFilter,
                                        },
                                    },
                                })
                            }
                        >
                            Exclude from{' '}
                            {distinctCategories.find(
                                (c) => c.id === categoryFilter,
                            )?.name ?? 'category'}
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() =>
                            setDialog({
                                kind: 'exclude',
                                target: {
                                    rule: { type: 'user', targetId: userId },
                                },
                            })
                        }
                    >
                        Exclude this user from the whole game
                    </button>
                </div>
            </div>

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
                                                    {r.verificationStatus ===
                                                    'verified'
                                                        ? '✓'
                                                        : ''}
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
                            className="btn btn-sm btn-primary"
                            onClick={() => setDialog({ kind: 'include' })}
                        >
                            Include selected runs
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() =>
                                setDialog({
                                    kind: 'exclude',
                                    target: { runIds: selectedRunIds },
                                })
                            }
                        >
                            Exclude selected runs
                        </button>
                    </div>
                </div>
            )}

            {dialog?.kind === 'exclude' && (
                <ExcludeDialog
                    gameSlug={gameSlug}
                    target={dialog.target}
                    onDone={afterMutation}
                    onClose={() => setDialog(null)}
                />
            )}
            {dialog?.kind === 'include' && (
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
