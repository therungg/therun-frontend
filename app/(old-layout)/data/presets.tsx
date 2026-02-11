'use client';

import React from 'react';
import { Button } from 'react-bootstrap';

interface Preset {
    label: string;
    description: string;
    filters: Record<string, string>;
}

function getDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

const PRESETS: Preset[] = [
    {
        label: 'Most Playtime by User',
        description: 'Users with the most total playtime (filter by game)',
        filters: {
            dataSource: 'runs',
            aggregate: 'sum',
            groupBy: 'username',
            aggregateColumn: 'total_run_time',
            limit: '50',
        },
    },
    {
        label: 'Most Attempts by User',
        description: 'Users with the most attempts (filter by game)',
        filters: {
            dataSource: 'runs',
            aggregate: 'sum',
            groupBy: 'username',
            aggregateColumn: 'attempt_count',
            limit: '50',
        },
    },
    {
        label: 'PB Count This Week',
        description: 'Number of PBs set in the last 7 days per game',
        filters: {
            dataSource: 'finished-runs',
            isPb: 'true',
            afterDate: getDateDaysAgo(7),
            aggregate: 'count',
            groupBy: 'game',
            limit: '50',
        },
    },
    {
        label: 'Recent PBs in Top 100 Categories',
        description: 'Latest PBs from the most popular categories',
        filters: {
            dataSource: 'finished-runs',
            isPb: 'true',
            topCategories: '100',
            aggregate: 'none',
            limit: '50',
        },
    },
    {
        label: 'Finished Runs Per User',
        description: 'Who has the most finished runs (filter by game)',
        filters: {
            dataSource: 'finished-runs',
            aggregate: 'count',
            groupBy: 'username',
            limit: '50',
        },
    },
    {
        label: 'Avg Finish Time Per User',
        description: 'Average finish time by user (filter by game)',
        filters: {
            dataSource: 'finished-runs',
            aggregate: 'avg',
            groupBy: 'username',
            aggregateColumn: 'time',
            limit: '50',
        },
    },
];

interface PresetsProps {
    onApply: (filters: Record<string, string>) => void;
}

export function Presets({ onApply }: PresetsProps) {
    return (
        <div className="d-flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
                <Button
                    key={preset.label}
                    variant="outline-primary"
                    size="sm"
                    title={preset.description}
                    onClick={() => onApply(preset.filters)}
                >
                    {preset.label}
                </Button>
            ))}
        </div>
    );
}
