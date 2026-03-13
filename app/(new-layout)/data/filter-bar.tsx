'use client';

import React from 'react';
import styles from './data.module.scss';
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
        <div className={styles.filterRow}>
            {visibleFilters.map((key) => {
                if (key === 'metric') {
                    return (
                        <div key={key}>
                            <select
                                className={styles.filterSelect}
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
                            </select>
                        </div>
                    );
                }

                return (
                    <div key={key}>{renderFilter(key, filters, onChange)}</div>
                );
            })}

            <div>
                <select
                    className={styles.filterSelect}
                    value={filters.limit}
                    onChange={(e) => onChange('limit', e.target.value)}
                    style={{ width: '5rem' }}
                >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                </select>
            </div>
        </div>
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
                <input
                    className={styles.filterInput}
                    type="text"
                    placeholder="Game"
                    value={filters.game}
                    onChange={(e) => onChange('game', e.target.value)}
                    style={{ minWidth: '10rem' }}
                />
            );
        case 'category':
            return (
                <input
                    className={styles.filterInput}
                    type="text"
                    placeholder="Category"
                    value={filters.category}
                    onChange={(e) => onChange('category', e.target.value)}
                    style={{ minWidth: '8rem' }}
                />
            );
        case 'username':
            return (
                <input
                    className={styles.filterInput}
                    type="text"
                    placeholder="Username"
                    value={filters.username}
                    onChange={(e) => onChange('username', e.target.value)}
                    style={{ minWidth: '8rem' }}
                />
            );
        case 'minPlaytime':
            return (
                <input
                    className={styles.filterInput}
                    type="number"
                    placeholder="Min hours"
                    value={filters.minPlaytime}
                    onChange={(e) => onChange('minPlaytime', e.target.value)}
                    style={{ width: '6.5rem' }}
                />
            );
        case 'minAttempts':
            return (
                <input
                    className={styles.filterInput}
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
                    <div className={styles.filterLabel}>After</div>
                    <input
                        className={styles.filterInput}
                        type="date"
                        value={filters.afterDate}
                        onChange={(e) => onChange('afterDate', e.target.value)}
                    />
                </div>
            );
        case 'beforeDate':
            return (
                <div>
                    <div className={styles.filterLabel}>Before</div>
                    <input
                        className={styles.filterInput}
                        type="date"
                        value={filters.beforeDate}
                        onChange={(e) => onChange('beforeDate', e.target.value)}
                    />
                </div>
            );
        case 'isPb':
            return (
                <select
                    className={styles.filterSelect}
                    value={filters.isPb}
                    onChange={(e) => onChange('isPb', e.target.value)}
                    style={{ minWidth: '7rem' }}
                >
                    <option value="">Any</option>
                    <option value="true">PBs only</option>
                    <option value="false">Non-PBs only</option>
                </select>
            );
        case 'topGames':
            return (
                <input
                    className={styles.filterInput}
                    type="number"
                    placeholder="Top N games"
                    value={filters.topGames}
                    onChange={(e) => onChange('topGames', e.target.value)}
                    style={{ width: '7.5rem' }}
                />
            );
        case 'topCategories':
            return (
                <input
                    className={styles.filterInput}
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
