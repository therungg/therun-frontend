'use client';

import React from 'react';
import { Col, Form, Row } from 'react-bootstrap';
import type { DataSource } from './data-explorer';

interface FilterBarProps {
    filters: {
        dataSource: DataSource;
        game: string;
        category: string;
        username: string;
        afterDate: string;
        beforeDate: string;
        isPb: string;
        minAttempts: string;
        maxAttempts: string;
        topGames: string;
        topCategories: string;
    };
    onChange: (key: string, value: string) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
    return (
        <div className="bg-body-secondary rounded-3 p-3">
            <Row className="g-2 mb-2">
                <Col xs={12} md={3}>
                    <Form.Label className="small text-secondary mb-1">
                        Data Source
                    </Form.Label>
                    <Form.Select
                        size="sm"
                        value={filters.dataSource}
                        onChange={(e) => onChange('dataSource', e.target.value)}
                    >
                        <option value="runs">Runs (per category)</option>
                        <option value="finished-runs">
                            Finished Runs (individual)
                        </option>
                    </Form.Select>
                </Col>
                <Col xs={12} md={3}>
                    <Form.Label className="small text-secondary mb-1">
                        Game
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="text"
                        placeholder="e.g. Super Mario 64"
                        value={filters.game}
                        onChange={(e) => onChange('game', e.target.value)}
                    />
                </Col>
                <Col xs={12} md={3}>
                    <Form.Label className="small text-secondary mb-1">
                        Category
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="text"
                        placeholder="e.g. 120 Star"
                        value={filters.category}
                        onChange={(e) => onChange('category', e.target.value)}
                    />
                </Col>
                <Col xs={12} md={3}>
                    <Form.Label className="small text-secondary mb-1">
                        Username
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="text"
                        placeholder="Exact username"
                        value={filters.username}
                        onChange={(e) => onChange('username', e.target.value)}
                    />
                </Col>
            </Row>

            <Row className="g-2 mb-2">
                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        After Date
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="date"
                        value={filters.afterDate}
                        onChange={(e) => onChange('afterDate', e.target.value)}
                    />
                </Col>
                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        Before Date
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="date"
                        value={filters.beforeDate}
                        onChange={(e) => onChange('beforeDate', e.target.value)}
                    />
                </Col>
                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        PBs Only
                    </Form.Label>
                    <Form.Select
                        size="sm"
                        value={filters.isPb}
                        onChange={(e) => onChange('isPb', e.target.value)}
                        disabled={filters.dataSource !== 'finished-runs'}
                    >
                        <option value="">Any</option>
                        <option value="true">PBs only</option>
                        <option value="false">Non-PBs only</option>
                    </Form.Select>
                </Col>
                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        Min Attempts
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="number"
                        placeholder="0"
                        value={filters.minAttempts}
                        onChange={(e) =>
                            onChange('minAttempts', e.target.value)
                        }
                    />
                </Col>
                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        Max Attempts
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="number"
                        value={filters.maxAttempts}
                        onChange={(e) =>
                            onChange('maxAttempts', e.target.value)
                        }
                    />
                </Col>
                <Col xs={6} md={2}>
                    {filters.dataSource === 'finished-runs' && (
                        <>
                            <Form.Label className="small text-secondary mb-1">
                                Top Games
                            </Form.Label>
                            <Form.Control
                                size="sm"
                                type="number"
                                placeholder="e.g. 100"
                                value={filters.topGames}
                                onChange={(e) =>
                                    onChange('topGames', e.target.value)
                                }
                            />
                        </>
                    )}
                </Col>
            </Row>

            {filters.dataSource === 'finished-runs' && (
                <Row className="g-2">
                    <Col xs={6} md={2}>
                        <Form.Label className="small text-secondary mb-1">
                            Top Categories
                        </Form.Label>
                        <Form.Control
                            size="sm"
                            type="number"
                            placeholder="e.g. 100"
                            value={filters.topCategories}
                            onChange={(e) =>
                                onChange('topCategories', e.target.value)
                            }
                        />
                    </Col>
                </Row>
            )}
        </div>
    );
}
