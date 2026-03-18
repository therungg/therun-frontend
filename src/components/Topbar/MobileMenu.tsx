'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BunnyIcon } from '~src/icons/bunny-icon';
import { Can } from '~src/rbac/Can.component';
import styles from './MobileMenu.module.scss';
import type { NavItem } from './topbar-nav-items';
import {
    aboutItems,
    competeItems,
    exploreItems,
    runItems,
    toolsItems,
} from './topbar-nav-items';

const GlobalSearch = dynamic(
    () =>
        import('~src/components/search/global-search.component').then(
            (mod) => mod.GlobalSearch,
        ),
    { ssr: false },
);

interface MobileMenuProps {
    username?: string;
}

export function MobileMenu({ username }: MobileMenuProps) {
    const [open, setOpen] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);

    const close = useCallback(() => setOpen(false), []);

    // Focus trap
    useEffect(() => {
        if (!open) return;

        const overlay = overlayRef.current;
        if (!overlay) return;

        const focusable = overlay.querySelectorAll<HTMLElement>(
            'a, button, input, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        const trap = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                close();
                return;
            }
            if (e.key !== 'Tab') return;
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
            }
        };

        document.addEventListener('keydown', trap);
        first?.focus();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', trap);
            document.body.style.overflow = '';
        };
    }, [open, close]);

    const renderSection = (label: string, items: NavItem[]) => (
        <div className={styles.section} key={label}>
            <div className={styles.sectionLabel}>{label}</div>
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={styles.link}
                    onClick={close}
                >
                    {item.label}
                </Link>
            ))}
        </div>
    );

    // Filter Run items: only show Upload if logged in
    const filteredRunItems = username
        ? runItems
        : runItems.filter((item) => item.href !== '/upload');

    // Collect admin items with RBAC — render a single Admin section
    // Each permission check wraps its own items
    const adminSection = (
        <div className={styles.section}>
            <div className={styles.sectionLabel}>Admin</div>
            <Can I="view-restricted" a="admins">
                <Link href="/data" className={styles.link} onClick={close}>
                    Stats
                </Link>
            </Can>
            <Can I="moderate" a="roles">
                <Link
                    href="/admin/roles"
                    className={styles.link}
                    onClick={close}
                >
                    Roles
                </Link>
                <Link
                    href="/admin/move-user"
                    className={styles.link}
                    onClick={close}
                >
                    Move User
                </Link>
            </Can>
            <Can I="moderate" a="admins">
                <Link
                    href="/admin/exclusions"
                    className={styles.link}
                    onClick={close}
                >
                    Exclusions
                </Link>
            </Can>
        </div>
    );

    return (
        <>
            <button
                type="button"
                className={styles.hamburger}
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                aria-label={open ? 'Close menu' : 'Open menu'}
            >
                <span
                    className={`${styles.bar} ${open ? styles.barOpen : ''}`}
                />
                <span
                    className={`${styles.bar} ${open ? styles.barOpen : ''}`}
                />
                <span
                    className={`${styles.bar} ${open ? styles.barOpen : ''}`}
                />
            </button>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: scrim click closes menu */}
            <div
                className={`${styles.scrim} ${open ? styles.scrimOpen : ''}`}
                onClick={close}
            />
            <div
                className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
                ref={overlayRef}
            >
                <div style={{ marginBottom: '1.25rem' }}>
                    <GlobalSearch />
                </div>
                {renderSection('Run', filteredRunItems)}
                {renderSection('Compete', competeItems)}
                {renderSection('Explore', exploreItems)}
                {username && renderSection('Tools', toolsItems)}
                <Can I="view-restricted" a="admins">
                    {adminSection}
                </Can>
                {renderSection('About', aboutItems)}
                <Link
                    href="/patron"
                    className={styles.standalone}
                    onClick={close}
                >
                    Support us <BunnyIcon />
                </Link>
            </div>
        </>
    );
}
