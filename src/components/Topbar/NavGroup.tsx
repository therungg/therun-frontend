'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import styles from './NavGroup.module.scss';
import type { NavItem } from './topbar-nav-items';

interface NavGroupProps {
    label: string;
    items?: NavItem[];
    children?: React.ReactNode;
}

export function NavGroup({ label, items, children }: NavGroupProps) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const groupRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setOpen(false);
            groupRef.current
                ?.querySelector<HTMLButtonElement>('button')
                ?.focus();
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            const firstItem =
                groupRef.current?.querySelector<HTMLAnchorElement>(
                    '[role="menuitem"]',
                );
            firstItem?.focus();
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const menuItems =
                groupRef.current?.querySelectorAll<HTMLAnchorElement>(
                    '[role="menuitem"]',
                );
            if (menuItems?.length) {
                menuItems[menuItems.length - 1].focus();
            }
        }
    }, []);

    const handleItemKeyDown = useCallback((e: React.KeyboardEvent) => {
        const menuItems =
            groupRef.current?.querySelectorAll<HTMLAnchorElement>(
                '[role="menuitem"]',
            );
        if (!menuItems) return;
        const currentIndex = Array.from(menuItems).indexOf(
            e.target as HTMLAnchorElement,
        );

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = menuItems[(currentIndex + 1) % menuItems.length];
            next?.focus();
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev =
                menuItems[
                    (currentIndex - 1 + menuItems.length) % menuItems.length
                ];
            prev?.focus();
        }
        if (e.key === 'Escape') {
            setOpen(false);
            groupRef.current
                ?.querySelector<HTMLButtonElement>('button')
                ?.focus();
        }
    }, []);

    if (!children && (!items || items.length === 0)) return null;

    return (
        <div
            className={styles.group}
            ref={groupRef}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                className={styles.trigger}
                aria-expanded={open}
                aria-haspopup="true"
                onClick={() => setOpen((prev) => !prev)}
                onKeyDown={handleKeyDown}
            >
                {label}
            </button>
            <div
                className={styles.dropdown}
                role="menu"
                style={
                    open
                        ? { opacity: 1, visibility: 'visible' as const }
                        : undefined
                }
            >
                {children ??
                    items?.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.item} ${pathname === item.href ? styles.active : ''}`}
                            role="menuitem"
                            tabIndex={open ? 0 : -1}
                            onKeyDown={handleItemKeyDown}
                            onClick={() => setOpen(false)}
                        >
                            {item.label}
                        </Link>
                    ))}
            </div>
        </div>
    );
}
