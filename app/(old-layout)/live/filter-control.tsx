'use client';
import React from 'react';
import { FilterState } from '~app/(old-layout)/live/live.types';

interface FilterControlProps {
    filters: FilterState;
    onChange: (filters: FilterState) => void;
}

interface FilterButton {
    key: keyof FilterState;
    label: string;
    color: string;
    ariaLabel: string;
}

export const FilterControl = ({ filters, onChange }: FilterControlProps) => {
    const filterButtons: FilterButton[] = [
        {
            key: 'liveOnTwitch',
            label: '🔴 Live',
            color: '#dc3545',
            ariaLabel: 'Filter by live on Twitch',
        },
        {
            key: 'ongoing',
            label: '▶️ Ongoing',
            color: '#0d6efd',
            ariaLabel: 'Filter by ongoing runs',
        },
        {
            key: 'pbPace',
            label: '⚡ PB Pace',
            color: '#198754',
            ariaLabel: 'Filter by runs ahead of personal best',
        },
    ];

    const toggleFilter = (key: keyof FilterState) => {
        onChange({
            ...filters,
            [key]: !filters[key],
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent, key: keyof FilterState) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleFilter(key);
        }
    };

    return (
        <div className="d-flex flex-wrap align-items-center gap-2">
            {filterButtons.map((button) => {
                const isActive = filters[button.key];
                return (
                    <button
                        key={button.key}
                        type="button"
                        onClick={() => toggleFilter(button.key)}
                        onKeyDown={(e) => handleKeyDown(e, button.key)}
                        aria-pressed={isActive}
                        aria-label={button.ariaLabel}
                        className="border"
                        style={{
                            height: '32px',
                            borderRadius: '16px',
                            padding: '0 16px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: isActive ? button.color : 'transparent',
                            color: isActive ? 'white' : 'var(--bs-body-color)',
                            borderColor: isActive
                                ? button.color
                                : 'var(--bs-border-color)',
                            outline: 'none',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        {button.label}
                    </button>
                );
            })}
        </div>
    );
};
