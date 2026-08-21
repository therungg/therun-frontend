'use client';

import clsx from 'clsx';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { Icon as IconType } from 'react-bootstrap-icons';
import { List } from 'react-bootstrap-icons';
import { useDialogBehavior } from '~app/(new-layout)/games-v2/[game]/shared/board-dialog';
import Link from '~src/components/link';
import styles from './console.module.scss';
import { ConsoleSidebar } from './console-sidebar';
import type { NavGroup } from './nav-types';

export interface ConsoleHeader {
    eyebrow: string; // "Admin" | "Settings"
    title: string; // game display name | "@username"
    titleHref: string; // where the title links
    image?: string | null; // optional 3:4 cover (manage passes game.image)
    actions?: ReactNode; // right-hand slot (manage: "All your games" + BackLink)
}

interface Props {
    header: ConsoleHeader;
    groups: NavGroup[];
    icons: Record<string, IconType>;
    activeItem: string | null;
    onNavigate: (id: string) => void;
    attentionCount?: number;
    /** True when one or more attention sources failed to load — the badge
     * count may be an undercount, not a confirmed total. */
    badgeDegraded?: boolean;
    navAriaLabel?: string;
    children: ReactNode;
}

/**
 * The persistent console chrome — header + sidebar + content slot — shared by
 * the main console (`ConsoleShell`, state-driven) and the moderation sub-route
 * pages (link-driven), so the sidebar context never disappears mid-workflow.
 * Owns only the mobile-sidebar open state; everything else is controlled.
 */
export function ConsoleChrome({
    header,
    groups,
    icons,
    activeItem,
    onNavigate,
    attentionCount = 0,
    badgeDegraded = false,
    navAriaLabel,
    children,
}: Props) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const sidebarRef = useRef<HTMLElement>(null);
    const closeSidebar = () => setSidebarOpen(false);

    // Below 768px the sidebar is a real overlay drawer (see
    // console.module.scss) — Escape, focus containment, background scroll
    // lock, and focus-restore-on-close all come from the same behavior
    // BoardDialog uses. Desktop never sets sidebarOpen true (the toggle
    // button that flips it is display:none there), so this is inert above
    // the breakpoint.
    useDialogBehavior({
        open: sidebarOpen,
        onClose: closeSidebar,
        panelRef: sidebarRef,
    });

    // If the viewport crosses back above the mobile breakpoint while the
    // drawer is open (window snap, rotation, monitor change), the CSS
    // reverts to desktop layout but the drawer's scroll lock and Tab trap
    // would otherwise persist. Close it so useDialogBehavior's own cleanup
    // unwinds them.
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const onChange = (e: MediaQueryListEvent) => {
            if (!e.matches) setSidebarOpen(false);
        };
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const handleSelect = (id: string) => {
        setSidebarOpen(false);
        onNavigate(id);
    };

    return (
        <div className={styles.shell}>
            <div className={styles.frame}>
                <header className={styles.header}>
                    <button
                        type="button"
                        className={clsx(
                            styles.menuToggle,
                            'btn btn-sm btn-outline-secondary',
                        )}
                        aria-label="Toggle navigation"
                        aria-expanded={sidebarOpen}
                        onClick={() => setSidebarOpen((v) => !v)}
                    >
                        <List size={18} aria-hidden="true" />
                    </button>
                    {header.image && (
                        <img
                            className={styles.cover}
                            src={header.image}
                            alt=""
                            width={44}
                            height={59}
                            loading="eager"
                        />
                    )}
                    <div>
                        <div className={styles.eyebrow}>{header.eyebrow}</div>
                        <h1 className={styles.title}>
                            <Link
                                href={header.titleHref}
                                className={styles.titleLink}
                            >
                                {header.title}
                            </Link>
                        </h1>
                    </div>
                    {header.actions && (
                        <div className={styles.headerActions}>
                            {header.actions}
                        </div>
                    )}
                </header>

                <div className={styles.body}>
                    {sidebarOpen && (
                        <button
                            type="button"
                            className={styles.scrim}
                            aria-label="Close navigation"
                            onClick={closeSidebar}
                        />
                    )}
                    <aside
                        ref={sidebarRef}
                        className={clsx(
                            styles.sidebar,
                            !sidebarOpen && styles.sidebarHidden,
                        )}
                    >
                        <div className={styles.sidebarInner}>
                            <ConsoleSidebar
                                groups={groups}
                                icons={icons}
                                activeItem={activeItem}
                                onSelect={handleSelect}
                                attentionCount={attentionCount}
                                badgeDegraded={badgeDegraded}
                                ariaLabel={navAriaLabel}
                            />
                        </div>
                    </aside>

                    <section className={styles.content}>{children}</section>
                </div>
            </div>
        </div>
    );
}
