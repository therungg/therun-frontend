'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ManageCategoryRow } from '~src/lib/category-mgmt';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { updateVisibilityAction } from '../visibility/actions/update-visibility.action';

interface Props {
    game: ResolvedGame;
    initialRows: ManageCategoryRow[];
}

type Filter = 'all' | 'active' | 'archived';

export function CategoriesQuickManagePage({ game, initialRows }: Props) {
    const [rows, setRows] = useState<ManageCategoryRow[]>(initialRows);
    const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
    const [filter, setFilter] = useState<Filter>('all');
    const [_isPending, startTransition] = useTransition();

    const visibleRows = rows.filter((r) => {
        if (filter === 'active') return r.active;
        if (filter === 'archived') return !r.active;
        return true;
    });

    const setPending = (id: number, pending: boolean) => {
        setPendingIds((prev) => {
            const next = new Set(prev);
            if (pending) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const toggle = (
        row: ManageCategoryRow,
        field: 'isMain' | 'active',
        value: boolean,
    ) => {
        const prevValue = row[field];
        setPending(row.id, true);
        setRows((rs) =>
            rs.map((r) => (r.id === row.id ? { ...r, [field]: value } : r)),
        );

        startTransition(async () => {
            const res = await updateVisibilityAction({
                gameSlug: game.name,
                gameId: game.id,
                categoryId: row.id,
                ...(field === 'isMain' ? { isMain: value } : {}),
                ...(field === 'active' ? { active: value } : {}),
            });
            setPending(row.id, false);
            if ('error' in res) {
                toast.error(res.error);
                setRows((rs) =>
                    rs.map((r) =>
                        r.id === row.id ? { ...r, [field]: prevValue } : r,
                    ),
                );
                return;
            }
            toast.success(
                field === 'isMain'
                    ? value
                        ? `${row.display}: marked main`
                        : `${row.display}: unmarked main`
                    : value
                      ? `${row.display}: activated`
                      : `${row.display}: archived`,
            );
        });
    };

    return (
        <div>
            <header className="d-flex align-items-center gap-3 mb-3">
                {game.image && (
                    <img
                        src={game.image}
                        alt={game.display}
                        width={48}
                        height={64}
                        className="rounded"
                        style={{ aspectRatio: '3 / 4' }}
                        loading="eager"
                    />
                )}
                <div>
                    <small className="text-muted d-block">
                        Quick-manage categories
                    </small>
                    <h1 className="mb-0">{game.display}</h1>
                </div>
                <div className="ms-auto d-flex gap-2">
                    <Link
                        href={`/games-v2/${game.name}/manage`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        ← Back to manage
                    </Link>
                </div>
            </header>

            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <span className="text-muted small">Show:</span>
                {(['all', 'active', 'archived'] as Filter[]).map((f) => (
                    <button
                        key={f}
                        type="button"
                        className={`btn btn-sm ${
                            filter === f
                                ? 'btn-primary'
                                : 'btn-outline-secondary'
                        }`}
                        onClick={() => setFilter(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
                <span className="ms-auto text-muted small">
                    {visibleRows.length} of {rows.length}
                </span>
            </div>

            {visibleRows.length === 0 ? (
                <p className="text-muted text-center my-5">
                    No categories match this filter.
                </p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-sm align-middle">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Group</th>
                                <th className="text-center">Main</th>
                                <th className="text-center">Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map((row) => {
                                const isPending = pendingIds.has(row.id);
                                return (
                                    <tr
                                        key={row.id}
                                        className={
                                            row.active ? '' : 'text-muted'
                                        }
                                    >
                                        <td>{row.display}</td>
                                        <td>
                                            {row.groupName ?? (
                                                <span className="text-muted">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={row.isMain}
                                                disabled={
                                                    isPending || !row.active
                                                }
                                                onChange={(e) =>
                                                    toggle(
                                                        row,
                                                        'isMain',
                                                        e.target.checked,
                                                    )
                                                }
                                                aria-label={`Main: ${row.display}`}
                                            />
                                        </td>
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={row.active}
                                                disabled={isPending}
                                                onChange={(e) =>
                                                    toggle(
                                                        row,
                                                        'active',
                                                        e.target.checked,
                                                    )
                                                }
                                                aria-label={`Active: ${row.display}`}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="text-muted small">
                Tip: a "main" category shows by default on the game page. If no
                main categories are set, the first 5 categories show by default
                and the rest go behind a toggle.
            </p>
        </div>
    );
}
