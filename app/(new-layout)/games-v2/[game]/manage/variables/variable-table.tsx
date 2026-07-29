'use client';

import { Fragment, useEffect, useRef } from 'react';
import type { VariableRow as VariableRowData } from '../../../../../../types/leaderboards.types';
import { VariableRow } from './variable-row';

export interface VariableTableProps {
    title: string;
    rows: VariableRowData[];
    emptyLabel: string;
    onEdit: (row: VariableRowData) => void;
    onDelete: (row: VariableRowData) => void;
    onMoveUp: (row: VariableRowData) => void;
    onMoveDown: (row: VariableRowData) => void;
    busy: boolean;
    /** Row to draw attention to after a jump from the in-effect panel. */
    highlightId?: number | null;
}

/**
 * `variable-row.tsx` is out of scope for this task, so the jumped-to row
 * can't take a className of its own. Instead we drop a marker row right
 * after it and scroll that into view — same effect (draw the eye, land the
 * scroll position) without touching a file this task doesn't own.
 */
export function VariableTable({
    title,
    rows,
    emptyLabel,
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
    busy,
    highlightId,
}: VariableTableProps) {
    const markerRef = useRef<HTMLTableRowElement | null>(null);

    // `rows` is a fresh array on every render (it's produced by .filter() in
    // the parent), so depending on it directly re-fires this effect — and
    // re-scrolls the viewport — on every unrelated re-render (a `busy`
    // toggle, a refresh completing, opening the form) for as long as
    // highlightId stays set. `present` is a boolean, stable across renders
    // unless the row's membership in this table actually changes.
    const present = rows.some((r) => r.id === highlightId);
    useEffect(() => {
        if (highlightId == null || !present) return;
        markerRef.current?.scrollIntoView({
            block: 'center',
            behavior: 'smooth',
        });
    }, [highlightId, present]);

    return (
        <div className="mb-3">
            <h3 className="h6 mb-2">{title}</h3>
            <div className="table-responsive">
                <table className="table table-sm align-middle">
                    <thead>
                        <tr>
                            <th />
                            <th>Name</th>
                            <th>Values</th>
                            <th>Default</th>
                            <th>Sort</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-muted">
                                    {emptyLabel}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, idx) => (
                                <Fragment key={row.id}>
                                    <VariableRow
                                        row={row}
                                        isFirst={idx === 0}
                                        isLast={idx === rows.length - 1}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onMoveUp={onMoveUp}
                                        onMoveDown={onMoveDown}
                                        isBusy={busy}
                                    />
                                    {highlightId === row.id && (
                                        <tr ref={markerRef}>
                                            <td
                                                colSpan={6}
                                                className="text-primary small py-1"
                                            >
                                                ↑ jumped here from the in-effect
                                                panel
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
