'use client';
import React from 'react';
import { SortOption } from '~app/(old-layout)/live/live.types';

interface SortControlProps {
    value: SortOption;
    onChange: (option: SortOption) => void;
}

export const SortControl = ({ value, onChange }: SortControlProps) => {
    const options = [
        { value: 'importance' as const, label: 'Importance' },
        { value: 'runtime' as const, label: 'Run Time' },
        { value: 'runner' as const, label: 'Runner' },
        { value: 'game' as const, label: 'Game' },
        { value: 'delta' as const, label: 'Delta to PB' },
    ];

    return (
        <div className="d-flex align-items-center gap-2">
            <label htmlFor="sort-select" className="text-muted mb-0">
                Sort by:
            </label>
            <select
                id="sort-select"
                className="form-select form-select-sm w-auto"
                value={value}
                onChange={(e) => onChange(e.target.value as SortOption)}
                aria-label="Sort live runs"
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
