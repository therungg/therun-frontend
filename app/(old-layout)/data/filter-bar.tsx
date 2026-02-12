'use client';

import React from 'react';
import { Col, Form, Row } from 'react-bootstrap';
import type { EntityTab, Filters, Metric } from './types';
import { METRIC_OPTIONS, TAB_FILTERS, USER_METRIC_OPTIONS } from './types';

interface FilterBarProps {
    tab: EntityTab;
    filters: Filters;
    onChange: (key: keyof Filters, value: string) => void;
}

export function FilterBar({ tab, filters, onChange }: FilterBarProps) {
    const visibleFilters = TAB_FILTERS[tab];
    const metricOptions =
        tab === 'users' ? USER_METRIC_OPTIONS : METRIC_OPTIONS;

    return (
        <Row className="g-2 align-items-end">
            {visibleFilters.map((key) => {
                if (key === 'metric') {
                    return (
                        <Col xs={6} md="auto" key={key}>
                            <Form.Select
                                size="sm"
                                value={filters.metric}
                                onChange={(e) =>
                                    onChange('metric', e.target.value as Metric)
                                }
                                style={{ minWidth: '10rem' }}
                            >
                                {metricOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </Form.Select>
                        </Col>
                    );
                }

                return (
                    <Col xs={6} md="auto" key={key}>
                        {renderFilter(key, filters, onChange)}
                    </Col>
                );
            })}

            <Col xs={6} md="auto">
                <Form.Select
                    size="sm"
                    value={filters.limit}
                    onChange={(e) => onChange('limit', e.target.value)}
                    style={{ width: '5rem' }}
                >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                </Form.Select>
            </Col>
        </Row>
    );
}

function renderFilter(
    key: keyof Filters,
    filters: Filters,
    onChange: (key: keyof Filters, value: string) => void,
): React.ReactNode {
    switch (key) {
        case 'game':
            return (
                <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Game"
                    value={filters.game}
                    onChange={(e) => onChange('game', e.target.value)}
                    style={{ minWidth: '10rem' }}
                />
            );
        case 'category':
            return (
                <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Category"
                    value={filters.category}
                    onChange={(e) => onChange('category', e.target.value)}
                    style={{ minWidth: '8rem' }}
                />
            );
        case 'username':
            return (
                <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Username"
                    value={filters.username}
                    onChange={(e) => onChange('username', e.target.value)}
                    style={{ minWidth: '8rem' }}
                />
            );
        case 'minPlaytime':
            return (
                <Form.Control
                    size="sm"
                    type="number"
                    placeholder="Min hours"
                    value={filters.minPlaytime}
                    onChange={(e) => onChange('minPlaytime', e.target.value)}
                    style={{ width: '6.5rem' }}
                />
            );
        case 'minAttempts':
            return (
                <Form.Control
                    size="sm"
                    type="number"
                    placeholder="Min attempts"
                    value={filters.minAttempts}
                    onChange={(e) => onChange('minAttempts', e.target.value)}
                    style={{ width: '7.5rem' }}
                />
            );
        case 'afterDate':
            return (
                <div>
                    <div
                        className="text-secondary mb-1"
                        style={{ fontSize: '0.7rem' }}
                    >
                        After
                    </div>
                    <Form.Control
                        size="sm"
                        type="date"
                        value={filters.afterDate}
                        onChange={(e) => onChange('afterDate', e.target.value)}
                    />
                </div>
            );
        case 'beforeDate':
            return (
                <div>
                    <div
                        className="text-secondary mb-1"
                        style={{ fontSize: '0.7rem' }}
                    >
                        Before
                    </div>
                    <Form.Control
                        size="sm"
                        type="date"
                        value={filters.beforeDate}
                        onChange={(e) => onChange('beforeDate', e.target.value)}
                    />
                </div>
            );
        case 'isPb':
            return (
                <Form.Select
                    size="sm"
                    value={filters.isPb}
                    onChange={(e) => onChange('isPb', e.target.value)}
                    style={{ minWidth: '7rem' }}
                >
                    <option value="">Any</option>
                    <option value="true">PBs only</option>
                    <option value="false">Non-PBs only</option>
                </Form.Select>
            );
        case 'topGames':
            return (
                <Form.Control
                    size="sm"
                    type="number"
                    placeholder="Top N games"
                    value={filters.topGames}
                    onChange={(e) => onChange('topGames', e.target.value)}
                    style={{ width: '7.5rem' }}
                />
            );
        case 'topCategories':
            return (
                <Form.Control
                    size="sm"
                    type="number"
                    placeholder="Top N categories"
                    value={filters.topCategories}
                    onChange={(e) => onChange('topCategories', e.target.value)}
                    style={{ width: '8.5rem' }}
                />
            );
        default:
            return null;
    }
}
