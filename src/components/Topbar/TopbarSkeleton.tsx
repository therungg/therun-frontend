"use client";
import React, { useEffect, useRef } from "react";
import ContentLoader from "react-content-loader";

export const TopbarSkeleton = (
    props: React.ComponentProps<typeof ContentLoader>,
) => {
    const skeletonRef = useRef<HTMLElement>(null);
    const contentLoaderProps = {
        id: "skeleton-topbar",
        speed: 2,
        title: "Loading Topbar",
        backgroundColor: "var(--bs-secondary-bg)",
        foregroundColor: "var(--bs-body-bg)",
        width: "100%", // Full width of the viewport
        height: "70", // Height remains fixed for the topbar
        viewBox: "0 0 100 7", // Using percentages for the viewBox
        preserveAspectRatio: "none",
        ...props,
    };
    useEffect(() => {
        skeletonRef.current = document.documentElement;
    }, []);

    const MobileSkeleton = (
        <>
            {/* Logo */}
            <rect x="5" y="2" rx="0.5" ry="0.5" width="30" height="4" />
            {/* Hamburger Menu */}
            <rect x="85" y="2" rx="0.5" ry="0.5" width="8" height="4" />
        </>
    );
    const BigSkeleton = (
        <>
            {/* Logo */}
            <rect x="2" y="2" rx="0.5" ry="0.5" width="16" height="3" />

            {/* Navigation Items */}
            <rect x="20" y="2" rx="0.5" ry="0.5" width="12" height="3" />
            <rect x="33" y="2" rx="0.5" ry="0.5" width="6" height="3" />
            <rect x="40" y="2" rx="0.5" ry="0.5" width="4" height="3" />
            <rect x="45" y="2" rx="0.5" ry="0.5" width="10" height="3" />

            {/* Search Bar */}
            <rect x="57" y="1.5" rx="0.5" ry="0.5" width="20" height="4" />

            {/* Theme Toggle */}
            <rect x="80" y="2" rx="0.5" ry="0.5" width="5" height="3" />

            {/* Login Button */}
            <rect x="87" y="1.5" rx="0.5" ry="0.5" width="10" height="4" />
        </>
    );

    return (
        <>
            <ContentLoader
                {...contentLoaderProps}
                uniqueKey="skeleton-topbar-big"
                className="d-none d-lg-block"
            >
                {BigSkeleton}
            </ContentLoader>
            <ContentLoader
                {...contentLoaderProps}
                className="d-block d-lg-none"
                uniqueKey="skeleton-topbar-small"
            >
                {MobileSkeleton}
            </ContentLoader>
        </>
    );
};
