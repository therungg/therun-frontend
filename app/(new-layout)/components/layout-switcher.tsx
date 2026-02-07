'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { setLayoutPreference } from '~src/actions/layout-preference.action';

interface LayoutSwitcherProps {
    currentLayout: 'old' | 'new';
}

export const LayoutSwitcher = ({ currentLayout }: LayoutSwitcherProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const handleSwitchLayout = async () => {
        const targetLayout = currentLayout === 'old' ? 'new' : 'old';
        await setLayoutPreference(targetLayout);

        if (targetLayout === 'new') {
            router.push('/frontpage');
        } else {
            router.push('/');
        }
    };

    const targetLayoutParams =
        currentLayout === 'old'
            ? { label: 'New Front Page', emoji: '✨' }
            : { label: 'Classic Front Page', emoji: '🏛️' };

    return (
        <div
            className="position-fixed bottom-0 end-0 p-3"
            style={{ zIndex: 1000 }}
        >
            <div
                style={{
                    background: 'var(--bs-body-bg)',
                    border: '1px solid var(--bs-border-color)',
                    borderRadius: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.2s ease-in-out',
                }}
            >
                {isOpen ? (
                    <div
                        className="d-flex gap-2 flex-column"
                        style={{ minWidth: '160px' }}
                    >
                        <p
                            className="mb-1"
                            style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                color: 'var(--bs-body-color)',
                                opacity: 0.8,
                            }}
                        >
                            Layout
                        </p>
                        <button
                            onClick={handleSwitchLayout}
                            className="btn btn-sm btn-outline-secondary"
                            style={{
                                fontSize: '0.8rem',
                                padding: '0.4rem 0.75rem',
                                color: 'var(--bs-body-color)',
                            }}
                        >
                            {targetLayoutParams.label}
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="btn btn-sm btn-link"
                            style={{
                                fontSize: '0.8rem',
                                padding: '0.4rem 0.75rem',
                                color: 'var(--bs-body-color)',
                                opacity: 0.7,
                                textDecoration: 'none',
                                transition: 'opacity 0.15s ease-in-out',
                            }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.opacity = '1')
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.opacity = '0.7')
                            }
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="btn btn-link p-0"
                        style={{
                            fontSize: '0.8rem',
                            color: 'var(--bs-secondary)',
                            textDecoration: 'none',
                            transition: 'color 0.15s ease-in-out',
                        }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.color = 'var(--bs-primary)')
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.color =
                                'var(--bs-secondary)')
                        }
                    >
                        ⚙️
                    </button>
                )}
            </div>
        </div>
    );
};
