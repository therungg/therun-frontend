'use client';

import React from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import type { EntityTab, Filters } from './types';
import { DEFAULT_FILTERS } from './types';

interface PresetConfig {
    label: string;
    description: string;
    tab: EntityTab;
    filters: Partial<Filters>;
}

function getDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

const PRESETS: PresetConfig[] = [
    {
        label: 'Top Games by Playtime',
        description: 'Which games have the most total playtime?',
        tab: 'games',
        filters: { metric: 'playtime', limit: '50' },
    },
    {
        label: 'PBs This Week',
        description: 'Personal bests set in the last 7 days',
        tab: 'finished-runs',
        filters: { isPb: 'true', afterDate: getDateDaysAgo(7) },
    },
    {
        label: 'Most Dedicated Runners',
        description: 'Who has the most total playtime across all games?',
        tab: 'users',
        filters: { metric: 'playtime', limit: '50' },
    },
    {
        label: 'Most Attempted Games',
        description: 'Which games have the most total attempts?',
        tab: 'games',
        filters: { metric: 'attempts', limit: '50' },
    },
];

interface PresetCardsProps {
    onApply: (tab: EntityTab, filters: Filters) => void;
}

export function PresetCards({ onApply }: PresetCardsProps) {
    return (
        <Row className="g-3 mb-4">
            {PRESETS.map((preset) => (
                <Col xs={6} lg={3} key={preset.label}>
                    <Card
                        className="h-100 border-0 bg-body-secondary"
                        role="button"
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            onApply(preset.tab, {
                                ...DEFAULT_FILTERS,
                                ...preset.filters,
                            } as Filters)
                        }
                    >
                        <Card.Body className="py-3 px-3">
                            <div className="fw-semibold small">
                                {preset.label}
                            </div>
                            <div
                                className="text-secondary"
                                style={{ fontSize: '0.8rem' }}
                            >
                                {preset.description}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            ))}
        </Row>
    );
}
