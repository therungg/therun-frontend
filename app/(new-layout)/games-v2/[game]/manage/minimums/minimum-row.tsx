'use client';

import { DurationToFormatted } from '~src/components/util/datetime';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';
import type { VariableDef } from '../../../../../../types/leaderboards.types';
import { describeSubcategory } from './subcategory-label';

interface Props {
    row: MinimumTime;
    variables: VariableDef[];
    onEdit: (row: MinimumTime) => void;
    onDelete: (row: MinimumTime) => void;
    isBusy: boolean;
}

export function MinimumRow({
    row,
    variables,
    onEdit,
    onDelete,
    isBusy,
}: Props) {
    return (
        <tr>
            <td>{describeSubcategory(row.subcategoryHash, variables)}</td>
            <td>
                {row.minTimeMs === null ? (
                    <span className="text-muted">—</span>
                ) : (
                    <DurationToFormatted
                        duration={row.minTimeMs / 1000}
                        withMillis
                    />
                )}
            </td>
            <td>
                {row.minGameTimeMs === null ? (
                    <span className="text-muted">—</span>
                ) : (
                    <DurationToFormatted
                        duration={row.minGameTimeMs / 1000}
                        withMillis
                    />
                )}
            </td>
            <td>
                {row.setBy === null ? (
                    <span className="text-muted">—</span>
                ) : (
                    <span title="user id">#{row.setBy}</span>
                )}
            </td>
            <td>
                <small className="text-muted">
                    {new Date(row.updatedAt).toLocaleString()}
                </small>
            </td>
            <td>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary me-2"
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
            </td>
        </tr>
    );
}
