'use client';

import { useMemo, useState } from 'react';
import type { ManageCategoryRow } from '~src/lib/category-mgmt';
import { formatCount, formatHours } from '~src/utils/format-stats';

const PAGE_SIZE = 25;

interface Props {
    rows: ManageCategoryRow[];
    selectedCategoryId: number;
    onSelect: (categoryId: number) => void;
}

function byPlaytimeDesc(a: ManageCategoryRow, b: ManageCategoryRow): number {
    return b.totalRunTime - a.totalRunTime;
}

export function CategoryRail({ rows, selectedCategoryId, onSelect }: Props) {
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);

    const { mainRows, otherRows, totalFiltered } = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filter = (r: ManageCategoryRow) => {
            if (!q) return true;
            return (
                r.display.toLowerCase().includes(q) ||
                (r.groupName?.toLowerCase().includes(q) ?? false)
            );
        };
        const mains = rows
            .filter((r) => r.isMain && filter(r))
            .sort(byPlaytimeDesc);
        const others = rows
            .filter((r) => !r.isMain && filter(r))
            .sort(byPlaytimeDesc);
        return {
            mainRows: mains,
            otherRows: others,
            totalFiltered: mains.length + others.length,
        };
    }, [rows, query]);

    const totalPages = Math.max(1, Math.ceil(otherRows.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const pagedOthers = otherRows.slice(
        safePage * PAGE_SIZE,
        (safePage + 1) * PAGE_SIZE,
    );

    const renderRow = (row: ManageCategoryRow) => {
        const selected = row.id === selectedCategoryId;
        return (
            <button
                key={row.id}
                type="button"
                className={`btn btn-sm text-start ${
                    selected ? 'btn-primary' : 'btn-outline-secondary'
                }`}
                onClick={() => onSelect(row.id)}
            >
                <div className="d-flex justify-content-between align-items-center">
                    <span className={row.active ? '' : 'text-muted'}>
                        {row.display}
                    </span>
                    {!row.active && (
                        <span className="badge bg-secondary">Archived</span>
                    )}
                </div>
                {row.groupName && (
                    <small className="d-block text-muted">
                        {row.groupName}
                    </small>
                )}
                <small className="d-block text-muted">
                    {formatCount(row.totalFinishedAttemptCount)} runs ·{' '}
                    {formatCount(row.uniqueRunners)} runners ·{' '}
                    {formatHours(row.totalRunTime)}h
                </small>
            </button>
        );
    };

    return (
        <aside
            className="border rounded p-2"
            style={{ position: 'sticky', top: '1rem', maxHeight: '80vh' }}
        >
            <input
                type="search"
                className="form-control form-control-sm mb-2"
                placeholder="Filter categories…"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                }}
            />
            <div
                className="d-flex flex-column gap-2 overflow-auto"
                style={{ maxHeight: 'calc(80vh - 7rem)' }}
            >
                {totalFiltered === 0 ? (
                    <div className="text-center my-3">
                        <p className="text-muted small mb-2">No matches.</p>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                                setQuery('');
                                setPage(0);
                            }}
                        >
                            Clear search
                        </button>
                    </div>
                ) : (
                    <>
                        {mainRows.length > 0 && (
                            <div className="d-flex flex-column gap-1">
                                <small className="text-muted text-uppercase fw-bold px-1">
                                    Currently displayed
                                </small>
                                {mainRows.map(renderRow)}
                            </div>
                        )}
                        {pagedOthers.length > 0 && (
                            <div className="d-flex flex-column gap-1">
                                <small className="text-muted text-uppercase fw-bold px-1">
                                    Other categories
                                </small>
                                {pagedOthers.map(renderRow)}
                            </div>
                        )}
                    </>
                )}
            </div>
            {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-2">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={safePage === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                        ← Prev
                    </button>
                    <small className="text-muted">
                        {safePage + 1} / {totalPages}
                    </small>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={safePage >= totalPages - 1}
                        onClick={() =>
                            setPage((p) => Math.min(totalPages - 1, p + 1))
                        }
                    >
                        Next →
                    </button>
                </div>
            )}
        </aside>
    );
}
