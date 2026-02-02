'use client';
import React from 'react';
import { SortDown } from 'react-bootstrap-icons';
import { SortOption } from '~app/(old-layout)/live/live.types';

interface SortControlProps {
    value: SortOption;
    onChange: (option: SortOption) => void;
}

export const SortControl = ({ value, onChange }: SortControlProps) => {
    const options = [
        { value: 'importance' as const, label: '🔥 Most Important' },
        { value: 'runtime' as const, label: '⏱️ Longest Runs' },
        { value: 'runner' as const, label: '👤 Runner (A-Z)' },
        { value: 'game' as const, label: '🎮 Game (A-Z)' },
        { value: 'delta' as const, label: '⚡ Best Pace' },
    ];

    return (
        <div className="d-flex align-items-center gap-2">
            <SortDown size={20} className="text-muted" />
            <select
                id="sort-select"
                className="form-select form-select-sm shadow-sm"
                value={value}
                onChange={(e) => onChange(e.target.value as SortOption)}
                aria-label="Sort live runs"
                style={{
                    width: 'auto',
                    minWidth: '200px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    borderRadius: '10px',
                    padding: '0.6rem 1rem',
                    transition: 'all 0.15s ease',
                    fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.01)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                }}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};
