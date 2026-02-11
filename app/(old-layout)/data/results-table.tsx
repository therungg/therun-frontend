'use client';

import React from 'react';
import { Alert, Spinner, Table } from 'react-bootstrap';
import { DurationToFormatted } from '~src/components/util/datetime';

const DURATION_COLUMNS = new Set([
    'personalBest',
    'sumOfBests',
    'totalRunTime',
    'time',
    'gameTime',
    'gameTimePb',
    'gameTimeSob',
    'personalBestTime',
]);

const DURATION_AGG_COLUMNS = new Set([
    'total_run_time',
    'personal_best',
    'sum_of_bests',
    'time',
    'game_time',
]);

interface ResultsTableProps {
    data: any;
    isLoading: boolean;
    error: any;
    isAggregate: boolean;
    aggregateColumn: string;
    apiUrl: string;
}

export function ResultsTable({
    data,
    isLoading,
    error,
    isAggregate,
    aggregateColumn,
    apiUrl,
}: ResultsTableProps) {
    if (!apiUrl) {
        return (
            <p className="text-secondary">
                Adjust filters and click Search to query data.
            </p>
        );
    }

    if (isLoading) {
        return (
            <div className="text-center py-4">
                <Spinner animation="border" size="sm" /> Loading...
            </div>
        );
    }

    if (error) {
        return <Alert variant="danger">Error fetching data.</Alert>;
    }

    if (!data) {
        return null;
    }

    const result = data.result ?? data;

    // Single count result (no group_by)
    if (
        result &&
        typeof result === 'object' &&
        'count' in result &&
        !Array.isArray(result)
    ) {
        return (
            <div className="bg-body-secondary rounded-3 p-4 text-center">
                <div className="text-secondary small">Count</div>
                <div className="fs-2 fw-bold">
                    {Number(result.count).toLocaleString()}
                </div>
            </div>
        );
    }

    const rows = Array.isArray(result) ? result : [];
    if (rows.length === 0) {
        return <Alert variant="info">No results found.</Alert>;
    }

    const columns = Object.keys(rows[0]);
    const isValueDuration =
        isAggregate && DURATION_AGG_COLUMNS.has(aggregateColumn);

    return (
        <div>
            <div className="small text-secondary mb-2">
                {rows.length} result{rows.length !== 1 ? 's' : ''}
            </div>
            <Table responsive hover bordered striped className="rounded-3">
                <thead>
                    <tr>
                        <th style={{ width: '2rem' }}>#</th>
                        {columns.map((col) => (
                            <th key={col}>{formatColumnHeader(col)}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row: any, i: number) => (
                        <tr key={i}>
                            <td className="text-secondary">{i + 1}</td>
                            {columns.map((col) => (
                                <td key={col}>
                                    {formatCell(
                                        col,
                                        row[col],
                                        col === 'value' && isValueDuration,
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
}

function formatColumnHeader(key: string): string {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase())
        .trim();
}

function formatCell(
    column: string,
    value: unknown,
    forceAsDuration: boolean,
): React.ReactNode {
    if (value === null || value === undefined) return '-';

    if (
        typeof value === 'number' &&
        (DURATION_COLUMNS.has(column) || forceAsDuration) &&
        value > 0
    ) {
        return <DurationToFormatted duration={value} />;
    }

    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return new Date(value).toLocaleString();
    }

    if (typeof value === 'number') return value.toLocaleString();

    return String(value);
}
