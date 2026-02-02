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
        <div
            className="d-flex align-items-center justify-content-center gap-3 p-4 rounded-3"
            style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
        >
            <div className="d-flex align-items-center gap-3">
                <SortDown
                    size={24}
                    className="text-primary"
                    style={{ opacity: 0.8 }}
                />
                <select
                    id="sort-select"
                    className="form-select border-0 shadow"
                    value={value}
                    onChange={(e) => onChange(e.target.value as SortOption)}
                    aria-label="Sort live runs"
                    style={{
                        width: 'auto',
                        minWidth: '240px',
                        cursor: 'pointer',
                        fontSize: '1.05rem',
                        fontWeight: '600',
                        borderRadius: '12px',
                        padding: '0.85rem 1.25rem',
                        background: 'rgba(255, 255, 255, 0.95)',
                        transition: 'all 0.2s ease',
                        fontFamily:
                            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow =
                            '0 8px 16px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '';
                    }}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};
