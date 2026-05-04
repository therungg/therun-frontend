'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function NavigationProgress() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [pending, setPending] = useState(false);

    useEffect(() => {
        setPending(false);
    }, [pathname, searchParams]);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }
            const anchor = (event.target as HTMLElement | null)?.closest('a');
            if (!anchor) return;
            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('#')) return;
            if (anchor.target && anchor.target !== '_self') return;
            try {
                const url = new URL(anchor.href, window.location.href);
                if (url.origin !== window.location.origin) return;
                if (
                    url.pathname === window.location.pathname &&
                    url.search === window.location.search
                ) {
                    return;
                }
                setPending(true);
            } catch {
                // ignore malformed URLs
            }
        };
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, []);

    if (!pending) return null;

    return (
        <div
            aria-hidden
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                zIndex: 9999,
                pointerEvents: 'none',
                overflow: 'hidden',
                background: 'transparent',
            }}
        >
            <div
                style={{
                    height: '100%',
                    width: '40%',
                    background:
                        'linear-gradient(90deg, transparent, var(--bs-primary, #007c00), transparent)',
                    animation: 'therun-nav-progress 1s linear infinite',
                }}
            />
            <style>{`
                @keyframes therun-nav-progress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(350%); }
                }
            `}</style>
        </div>
    );
}
