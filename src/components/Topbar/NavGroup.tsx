'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
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
    const triggerRef = useRef<HTMLElement>(null);

    // Close on click outside (#7)
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (
                groupRef.current &&
                !groupRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setOpen(false);
            triggerRef.current?.focus();
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
            triggerRef.current?.focus();
        }
    }, []);

    if (!children && (!items || items.length === 0)) return null;

    const isActive = (href: string) =>
        pathname === href || pathname.startsWith(`${href}/`);

    const isGroupActive = items?.some((item) => isActive(item.href));
    const firstHref = items?.[0]?.href;

    return (
        <div
            className={styles.group}
            ref={groupRef}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            {firstHref ? (
                <Link
                    ref={triggerRef as React.Ref<HTMLAnchorElement>}
                    href={firstHref}
                    className={`${styles.trigger} ${isGroupActive ? styles.active : ''}`}
                    aria-expanded={open}
                    aria-haspopup="true"
                    onKeyDown={handleKeyDown}
                >
                    {label}
                </Link>
            ) : (
                <button
                    ref={triggerRef as React.Ref<HTMLButtonElement>}
                    type="button"
                    className={`${styles.trigger} ${isGroupActive ? styles.active : ''}`}
                    aria-expanded={open}
                    aria-haspopup="true"
                    onClick={() => setOpen((prev) => !prev)}
                    onKeyDown={handleKeyDown}
                >
                    {label}
                </button>
            )}
            <div
                className={styles.dropdown}
                role="menu"
                style={
                    open
                        ? {
                              opacity: 1,
                              visibility: 'visible' as const,
                              transform: 'translateY(0)',
                          }
                        : undefined
                }
                onKeyDown={handleItemKeyDown}
            >
                {children ??
                    items?.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.item} ${isActive(item.href) ? styles.active : ''}`}
                            role="menuitem"
                            tabIndex={open ? 0 : -1}
                            onClick={() => setOpen(false)}
                        >
                            {item.live && <span className={styles.liveDot} />}
                            {item.label}
                        </Link>
                    ))}
            </div>
        </div>
    );
}
