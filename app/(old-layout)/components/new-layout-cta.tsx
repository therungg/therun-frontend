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
        <>
            <style>{`
                @keyframes cta-glow-drift {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
                    33% { transform: translate(5%, -8%) scale(1.1); opacity: 0.2; }
                    66% { transform: translate(-3%, 5%) scale(0.95); opacity: 0.12; }
                }
                @keyframes cta-glow-drift-2 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.08; }
                    33% { transform: translate(-4%, 6%) scale(1.05); opacity: 0.12; }
                    66% { transform: translate(6%, -4%) scale(0.9); opacity: 0.06; }
                }
                .new-layout-cta-btn {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .new-layout-cta-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 14px rgba(96, 140, 89, 0.45), inset 0 1px 0 rgba(255,255,255,0.15) !important;
                }
                .new-layout-cta-dismiss {
                    transition: opacity 0.2s ease;
                }
                .new-layout-cta-dismiss:hover {
                    opacity: 0.8 !important;
                }
            `}</style>
            <div
                style={{
                    background:
                        'linear-gradient(135deg, #0D0F0D 0%, #1a2e1a 50%, #0D0F0D 100%)',
                    border: '1px solid rgba(96, 140, 89, 0.4)',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.5rem',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    margin: '0.75rem',
                }}
            >
                {/* Animated glow 1 */}
                <div
                    style={{
                        position: 'absolute',
                        top: '-50%',
                        left: '-20%',
                        width: '60%',
                        height: '200%',
                        background:
                            'radial-gradient(ellipse, rgba(96, 140, 89, 0.15) 0%, transparent 70%)',
                        pointerEvents: 'none',
                        animation: 'cta-glow-drift 8s ease-in-out infinite',
                    }}
                />
                {/* Animated glow 2 */}
                <div
                    style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-10%',
                        width: '40%',
                        height: '200%',
                        background:
                            'radial-gradient(ellipse, rgba(76, 175, 80, 0.08) 0%, transparent 70%)',
                        pointerEvents: 'none',
                        animation: 'cta-glow-drift-2 10s ease-in-out infinite',
                    }}
                />

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            minWidth: '28px',
                            background: 'rgba(96, 140, 89, 0.25)',
                            borderRadius: '50%',
                            fontSize: '14px',
                        }}
                    >
                        ✨
                    </span>
                    <span style={{ fontSize: '0.9rem' }}>
                        <strong style={{ color: '#E2E8E1' }}>
                            New homepage available
                        </strong>
                        <span
                            className="d-none d-md-inline"
                            style={{
                                color: 'rgba(226, 232, 225, 0.6)',
                                fontSize: '0.85rem',
                            }}
                        >
                            {' '}
                            — live races, trending games, your stats, and a
                            customizable layout
                        </span>
                    </span>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    <button
                        onClick={handleTryNew}
                        className="new-layout-cta-btn"
                        style={{
                            background:
                                'linear-gradient(135deg, #608C59, #4CAF50)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.45rem 1.25rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow:
                                '0 2px 8px rgba(96, 140, 89, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                            letterSpacing: '0.02em',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Try it out →
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="new-layout-cta-dismiss"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(226, 232, 225, 0.4)',
                            cursor: 'pointer',
                            padding: '4px',
                            lineHeight: 1,
                        }}
                        aria-label="Dismiss"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </>
    );
};
