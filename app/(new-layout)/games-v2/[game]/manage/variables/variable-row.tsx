'use client';

import type { VariableRow as VariableRowData } from '../../../../../../types/leaderboards.types';

interface Props {
    row: VariableRowData;
    isFirst: boolean;
    isLast: boolean;
    onEdit: (row: VariableRowData) => void;
    onDelete: (row: VariableRowData) => void;
    onMoveUp: (row: VariableRowData) => void;
    onMoveDown: (row: VariableRowData) => void;
    isBusy: boolean;
}

function describeBucket(bucket: string[]): string {
    if (bucket.length <= 1) return bucket[0] ?? '';
    return `${bucket[0]} (${bucket.slice(1).join(', ')})`;
}

export function VariableRow({
    row,
    isFirst,
    isLast,
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
    isBusy,
}: Props) {
    const defaultLabel =
        row.role === 'subcategory' && row.defaultValueIndex != null
            ? (row.values[row.defaultValueIndex]?.[0] ?? '—')
            : '—';
    const roleBadge =
        row.role === 'subcategory' ? 'text-bg-primary' : 'text-bg-secondary';

    return (
        <tr>
            <td className="text-nowrap" style={{ width: '5rem' }}>
                <div className="btn-group btn-group-sm" role="group">
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => onMoveUp(row)}
                        disabled={isBusy || isFirst}
                        aria-label="Move up"
                    >
                        ↑
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => onMoveDown(row)}
                        disabled={isBusy || isLast}
                        aria-label="Move down"
                    >
                        ↓
                    </button>
                </div>
            </td>
            <td title={row.description ?? undefined}>
                <strong>{row.name}</strong>{' '}
                <span className={`badge ${roleBadge} ms-2`}>{row.role}</span>
                <div>
                    <code className="small text-muted">
                        {row.nameNormalized}
                    </code>
                </div>
            </td>
            <td>
                <ul className="list-unstyled mb-0 small">
                    {row.values.map((bucket, idx) => (
                        <li
                            key={`${row.id}-${idx}`}
                            className={
                                row.defaultValueIndex === idx
                                    ? 'fw-semibold'
                                    : undefined
                            }
                        >
                            {describeBucket(bucket)}
                            {row.defaultValueIndex === idx && (
                                <span className="badge text-bg-light ms-1">
                                    default
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </td>
            <td className="text-muted small">{defaultLabel}</td>
            <td>{row.sortOrder}</td>
            <td className="text-end">
                <div className="d-flex gap-1 justify-content-end">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => onEdit(row)}
                        disabled={isBusy}
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onDelete(row)}
                        disabled={isBusy}
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
}
