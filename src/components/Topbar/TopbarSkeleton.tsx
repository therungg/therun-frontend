'use client';

import React from 'react';
import ContentLoader from 'react-content-loader';

export const TopbarSkeleton = (
    props: React.ComponentProps<typeof ContentLoader>,
) => {
    const contentLoaderProps = {
        id: 'skeleton-topbar',
        speed: 2,
        title: 'Loading Topbar',
        backgroundColor: 'var(--bs-secondary-bg)',
        foregroundColor: 'var(--bs-body-bg)',
        width: '100%',
        height: '44',
        viewBox: '0 0 100 4.4',
        preserveAspectRatio: 'none',
        ...props,
    };

    return (
        <>
            <ContentLoader
                {...contentLoaderProps}
                uniqueKey="skeleton-topbar-big"
                style={{ display: 'none' }}
                className="topbar-skeleton-desktop"
            >
                {/* Logo */}
                <rect x="1" y="0.8" rx="0.3" ry="0.3" width="12" height="2.8" />
                {/* Nav groups */}
                <rect x="15" y="1.2" rx="0.3" ry="0.3" width="4" height="2" />
                <rect x="20" y="1.2" rx="0.3" ry="0.3" width="6" height="2" />
                <rect x="27" y="1.2" rx="0.3" ry="0.3" width="6" height="2" />
                <rect x="34" y="1.2" rx="0.3" ry="0.3" width="5" height="2" />
                <rect x="40" y="1.2" rx="0.3" ry="0.3" width="8" height="2" />
                {/* Search */}
                <rect
                    x="70"
                    y="0.8"
                    rx="0.3"
                    ry="0.3"
                    width="14"
                    height="2.8"
                />
                {/* Theme + user */}
                <rect x="86" y="1.2" rx="0.3" ry="0.3" width="4" height="2" />
                <rect x="92" y="0.8" rx="0.3" ry="0.3" width="6" height="2.8" />
            </ContentLoader>
            <ContentLoader
                {...contentLoaderProps}
                uniqueKey="skeleton-topbar-small"
                style={{ display: 'none' }}
                className="topbar-skeleton-mobile"
            >
                {/* Logo */}
                <rect x="2" y="0.8" rx="0.3" ry="0.3" width="25" height="2.8" />
                {/* Hamburger */}
                <rect x="88" y="1" rx="0.3" ry="0.3" width="8" height="2.4" />
            </ContentLoader>
            <style>{`
                @media (min-width: 992px) {
                    .topbar-skeleton-desktop { display: block !important; }
                    .topbar-skeleton-mobile { display: none !important; }
                }
                @media (max-width: 991.98px) {
                    .topbar-skeleton-desktop { display: none !important; }
                    .topbar-skeleton-mobile { display: block !important; }
                }
            `}</style>
        </>
    );
};
