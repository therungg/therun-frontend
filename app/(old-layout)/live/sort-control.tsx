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
            <span className="text-muted">Sort by:</span>
            <div className="btn-group" role="group" aria-label="Sort options">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        className={`btn ${value === option.value ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => onChange(option.value)}
                        aria-pressed={value === option.value}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
