'use client';

import clsx from 'clsx';
import { type ReactNode, useState } from 'react';
import { List } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import styles from './console.module.scss';
import { ConsoleSidebar } from './console-sidebar';
import type { NavGroup, NavItemId } from './nav-model';

interface Props {
    game: ResolvedGame;
    groups: NavGroup[];
    activeItem: NavItemId | null;
    onNavigate: (id: NavItemId) => void;
    attentionCount: number;
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
    categories,
    selectedCategoryId,
    onSelectCategory,
    children,
}: Props) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
                <aside
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
