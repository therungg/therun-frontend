'use client';

import React from 'react';
import { Col, Form, Row } from 'react-bootstrap';
import type { AggregateMode, DataSource } from './data-explorer';

const RUNS_AGG_COLUMNS = [
    { value: 'total_run_time', label: 'Total Run Time' },
    { value: 'attempt_count', label: 'Attempt Count' },
    { value: 'finished_attempt_count', label: 'Finished Attempts' },
    { value: 'personal_best', label: 'Personal Best' },
    { value: 'sum_of_bests', label: 'Sum of Bests' },
];

const FINISHED_RUNS_AGG_COLUMNS = [
    { value: 'time', label: 'Time' },
    { value: 'game_time', label: 'Game Time' },
];

interface AggregateBarProps {
    dataSource: DataSource;
    aggregate: AggregateMode;
    aggregateColumn: string;
    groupBy: string;
    limit: string;
    onChange: (key: string, value: string) => void;
}

export function AggregateBar({
    dataSource,
    aggregate,
    aggregateColumn,
    groupBy,
    limit,
    onChange,
}: AggregateBarProps) {
    const aggColumns =
        dataSource === 'runs' ? RUNS_AGG_COLUMNS : FINISHED_RUNS_AGG_COLUMNS;
    const needsColumn = aggregate === 'sum' || aggregate === 'avg';

    return (
        <div className="bg-body-secondary rounded-3 p-3">
            <Row className="g-2 align-items-end">
                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        Aggregate
                    </Form.Label>
                    <Form.Select
                        size="sm"
                        value={aggregate}
                        onChange={(e) => onChange('aggregate', e.target.value)}
                    >
                        <option value="none">None (raw rows)</option>
                        <option value="count">Count</option>
                        <option value="sum">Sum</option>
                        <option value="avg">Average</option>
                    </Form.Select>
                </Col>

                {aggregate !== 'none' && (
                    <Col xs={6} md={2}>
                        <Form.Label className="small text-secondary mb-1">
                            Group By
                        </Form.Label>
                        <Form.Select
                            size="sm"
                            value={groupBy}
                            onChange={(e) =>
                                onChange('groupBy', e.target.value)
                            }
                        >
                            <option value="">
                                None{aggregate !== 'count' ? ' (required)' : ''}
                            </option>
                            <option value="username">Username</option>
                            <option value="game">Game</option>
                            <option value="category">Category</option>
                        </Form.Select>
                    </Col>
                )}

                {needsColumn && (
                    <Col xs={6} md={3}>
                        <Form.Label className="small text-secondary mb-1">
                            Column
                        </Form.Label>
                        <Form.Select
                            size="sm"
                            value={
                                aggregateColumn || aggColumns[0]?.value || ''
                            }
                            onChange={(e) =>
                                onChange('aggregateColumn', e.target.value)
                            }
                        >
                            {aggColumns.map((col) => (
                                <option key={col.value} value={col.value}>
                                    {col.label}
                                </option>
                            ))}
                        </Form.Select>
                    </Col>
                )}

                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        Limit
                    </Form.Label>
                    <Form.Select
                        size="sm"
                        value={limit}
                        onChange={(e) => onChange('limit', e.target.value)}
                    >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                    </Form.Select>
                </Col>
            </Row>
        </div>
    );
}
