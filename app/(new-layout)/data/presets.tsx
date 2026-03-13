'use client';

import React from 'react';
import styles from './data.module.scss';
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
        <div className={styles.presetGrid}>
            {PRESETS.map((preset) => (
                <div
                    key={preset.label}
                    className={styles.presetCard}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                        onApply(preset.tab, {
                            ...DEFAULT_FILTERS,
                            ...preset.filters,
                        } as Filters)
                    }
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onApply(preset.tab, {
                                ...DEFAULT_FILTERS,
                                ...preset.filters,
                            } as Filters);
                        }
                    }}
                >
                    <div className={styles.presetLabel}>{preset.label}</div>
                    <div className={styles.presetDescription}>
                        {preset.description}
                    </div>
                </div>
            ))}
        </div>
    );
}
