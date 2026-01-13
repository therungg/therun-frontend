'use client';

import { useState } from 'react';
import { setLayoutPreference } from '~src/actions/layout-preference.action';

export const NewLayoutCTA = () => {
    const [isHovering, setIsHovering] = useState(false);

    const handleTryNew = async () => {
        await setLayoutPreference('new');
        window.location.href = '/frontpage';
    };

    return (
        <div
            className="mt-4 p-4 rounded-2 text-center"
            style={{
                background: 'rgba(96, 140, 89, 0.08)',
                border: '1px solid rgba(96, 140, 89, 0.2)',
                transition: 'all 0.2s ease-in-out',
                transform: isHovering ? 'translateY(-1px)' : 'translateY(0)',
                boxShadow: isHovering
                    ? '0 4px 12px rgba(96, 140, 89, 0.1)'
                    : '0 2px 6px rgba(0, 0, 0, 0.05)',
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <h4 className="fw-bold mb-2">Try Our New Homepage</h4>
            <p className="mb-3" style={{ fontSize: '0.95rem', opacity: 0.85 }}>
                Check out our redesigned homepage with improved layouts and a
                modern experience.
            </p>
            <button
                onClick={handleTryNew}
                className="btn btn-sm btn-primary px-4 py-2 rounded-2"
                style={{
                    transition: 'all 0.15s ease-in-out',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                }}
            >
                Try New Layout →
            </button>
        </div>
    );
};
