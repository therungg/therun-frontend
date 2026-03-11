'use client';

import { useState } from 'react';
import { X } from 'react-bootstrap-icons';
import { setLayoutPreference } from '~src/actions/layout-preference.action';

const DISMISS_KEY = 'new-layout-cta-dismissed';

export const NewLayoutCTA = () => {
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return sessionStorage.getItem(DISMISS_KEY) === '1';
    });

    const handleTryNew = async () => {
        await setLayoutPreference('new');
        window.location.href = '/frontpage';
    };

    const handleDismiss = () => {
        sessionStorage.setItem(DISMISS_KEY, '1');
        setDismissed(true);
    };

    if (dismissed) return null;

    return (
        <div
            className="d-flex align-items-center justify-content-center gap-3 px-3 py-2"
            style={{
                background:
                    'linear-gradient(90deg, rgba(96, 140, 89, 0.15), rgba(96, 140, 89, 0.25), rgba(96, 140, 89, 0.15))',
                borderBottom: '1px solid rgba(96, 140, 89, 0.3)',
            }}
        >
            <span style={{ fontSize: '0.9rem' }}>
                <strong>New homepage available</strong>
                <span className="d-none d-md-inline">
                    {' '}
                    — live races, trending games, your stats, and a customizable
                    layout
                </span>
            </span>
            <button
                onClick={handleTryNew}
                className="btn btn-sm px-3 py-1 fw-medium"
                style={{
                    fontSize: '0.8rem',
                    background: 'rgba(96, 140, 89, 0.9)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                }}
            >
                Try it out
            </button>
            <button
                onClick={handleDismiss}
                className="btn btn-sm p-0 ms-1"
                style={{
                    color: 'inherit',
                    opacity: 0.6,
                    lineHeight: 1,
                }}
                aria-label="Dismiss"
            >
                <X size={18} />
            </button>
        </div>
    );
};
