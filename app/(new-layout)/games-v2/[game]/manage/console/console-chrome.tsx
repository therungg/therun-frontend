'use client';

import clsx from 'clsx';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { List } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { useDialogBehavior } from '../../shared/board-dialog';
import styles from './console.module.scss';
import { ConsoleSidebar } from './console-sidebar';
import type { NavGroup, NavItemId } from './nav-model';

interface Props {
    game: ResolvedGame;
    groups: NavGroup[];
    activeItem: NavItemId | null;
    onNavigate: (id: NavItemId) => void;
    attentionCount: number;
    /** True when one or more attention sources failed to load — the badge
     * count may be an undercount, not a confirmed total. */
    badgeDegraded?: boolean;
    categories: Array<{ id: number; display: string }>;
    selectedCategoryId: number | null;
    onSelectCategory: (id: number) => void;
    children: ReactNode;
}

/**
 * The persistent console chrome — header + sidebar + content slot — shared by
 * the main console (`ConsoleShell`, state-driven) and the moderation sub-route
 * pages (link-driven), so the sidebar context never disappears mid-workflow.
 * Owns only the mobile-sidebar open state; everything else is controlled.
 */
export function ConsoleChrome({
    game,
    groups,
    activeItem,
    onNavigate,
    attentionCount,
    badgeDegraded = false,
    categories,
    selectedCategoryId,
    onSelectCategory,
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

    const handleSelect = (id: NavItemId) => {
        setSidebarOpen(false);
        onNavigate(id);
    };

    return (
        <div className={styles.shell}>
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
                {game.image && (
                    <img
                        className={styles.cover}
                        src={game.image}
                        alt=""
                        width={44}
                        height={59}
                        loading="eager"
                    />
                )}
                <div>
                    <div className={styles.eyebrow}>Admin</div>
                    <h1 className={styles.title}>{game.display}</h1>
                </div>
                <div className={styles.headerActions}>
                    <Link
                        href={`/games-v2/${game.name}`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        Back to leaderboards
                    </Link>
                </div>
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
                    <ConsoleSidebar
                        groups={groups}
                        activeItem={activeItem}
                        onSelect={handleSelect}
                        attentionCount={attentionCount}
                        badgeDegraded={badgeDegraded}
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        onSelectCategory={onSelectCategory}
                    />
                </aside>

                <section className={styles.content}>{children}</section>
            </div>
        </div>
    );
}
