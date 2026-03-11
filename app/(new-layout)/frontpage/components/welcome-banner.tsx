'use client';

import { useState } from 'react';
import { ChatLeftText, X } from 'react-bootstrap-icons';

const DISMISS_KEY = 'frontpage-welcome-dismissed';

export const WelcomeBanner = () => {
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(DISMISS_KEY) === '1';
    });

    if (dismissed) return null;

    const handleDismiss = () => {
        localStorage.setItem(DISMISS_KEY, '1');
        setDismissed(true);
    };

    return (
        <div
            style={{
                background:
                    'linear-gradient(135deg, rgba(96, 140, 89, 0.12), rgba(96, 140, 89, 0.06))',
                border: '1px solid rgba(96, 140, 89, 0.25)',
                borderRadius: '0.75rem',
                padding: '1rem 1.25rem',
            }}
        >
            <div className="d-flex align-items-start justify-content-between gap-3">
                <div>
                    <h6
                        className="fw-bold mb-1"
                        style={{ fontSize: '0.95rem' }}
                    >
                        The new therun.gg homepage is here!
                    </h6>
                    <p
                        className="mb-2"
                        style={{
                            fontSize: '0.85rem',
                            opacity: 0.85,
                            lineHeight: 1.5,
                        }}
                    >
                        We've been working hard on a brand new experience — live
                        runs front and center, trending games, your personal
                        stats at a glance, and a fully customizable layout. We'd
                        love to hear what you think!
                    </p>
                    <a
                        href="https://forms.gle/VDkTgv3NK2eS15KD8"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm px-3 py-1 fw-medium d-inline-flex align-items-center gap-2"
                        style={{
                            fontSize: '0.8rem',
                            background: 'rgba(96, 140, 89, 0.9)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                        }}
                    >
                        <ChatLeftText size={13} />
                        Give feedback
                    </a>
                </div>
                <button
                    onClick={handleDismiss}
                    className="btn btn-sm p-0 flex-shrink-0"
                    style={{
                        color: 'inherit',
                        opacity: 0.5,
                        lineHeight: 1,
                        marginTop: '2px',
                    }}
                    aria-label="Dismiss"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};
