'use client';

import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { List } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../types/leaderboards.types';
import type { AttentionItem } from '../moderation/attention/attention-model';
import { HistoryDrawer } from '../moderation/configure/history-drawer';
import styles from './console.module.scss';
import { ConsoleSidebar } from './console-sidebar';
import { ContentRouter } from './content-router';
import {
    buildNav,
    defaultItem,
    type NavFlags,
    type NavItemId,
} from './nav-model';

export interface ConsoleShellProps {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    flags: NavFlags;
    attentionItems: AttentionItem[];
    initialCategoryId: number | null;
    initialSlug: string | null;
    initialAbbreviation: string | null;
    initialRows: ManageCategoryRow[];
    initialGroups: ManageGroup[];
}

export function ConsoleShell({
    game,
    categories,
    flags,
    attentionItems,
    initialCategoryId,
    initialSlug,
    initialAbbreviation,
    initialRows,
    initialGroups,
}: ConsoleShellProps) {
    const groups = useMemo(() => buildNav(flags), [flags]);
    const [activeItem, setActiveItem] = useState<NavItemId | null>(() =>
        defaultItem(groups),
    );
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
        initialCategoryId,
    );
    const [rows, setRows] = useState<ManageCategoryRow[]>(initialRows);
    const [manageGroups, setManageGroups] =
        useState<ManageGroup[]>(initialGroups);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const selectedCategory = useMemo<ResolvedCategory | null>(
        () => categories.find((c) => c.id === selectedCategoryId) ?? null,
        [categories, selectedCategoryId],
    );

    const applyRowPatch = useCallback(
        (categoryId: number, patch: { isMain?: boolean; active?: boolean }) => {
            setRows((rs) =>
                rs.map((r) => (r.id === categoryId ? { ...r, ...patch } : r)),
            );
        },
        [],
    );

    // History is a quick-reference overlay, not a destination pane — selecting
    // it opens the drawer over the current pane (keeps the active item put).
    const handleSelect = (id: NavItemId) => {
        setSidebarOpen(false);
        if (id === 'history') {
            setHistoryOpen(true);
            return;
        }
        setActiveItem(id);
    };

    const categoryOptions = useMemo(
        () => categories.map((c) => ({ id: c.id, display: c.display })),
        [categories],
    );

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
                        attentionCount={attentionItems.length}
                        categories={categoryOptions}
                        selectedCategoryId={selectedCategoryId}
                        onSelectCategory={setSelectedCategoryId}
                    />
                </aside>

                <section className={styles.content}>
                    <ContentRouter
                        activeItem={activeItem}
                        game={game}
                        categories={categoryOptions}
                        selectedCategory={selectedCategory}
                        canEditStandards={flags.canEditStandards}
                        attentionItems={attentionItems}
                        initialSlug={initialSlug}
                        initialAbbreviation={initialAbbreviation}
                        rows={rows}
                        groups={manageGroups}
                        onGroupsChange={setManageGroups}
                        onRowChange={applyRowPatch}
                        onRowGroupChange={(categoryId, groupId, groupName) =>
                            setRows((rs) =>
                                rs.map((r) =>
                                    r.id === categoryId
                                        ? { ...r, groupId, groupName }
                                        : r,
                                ),
                            )
                        }
                        onEditCategory={(id) => {
                            setSelectedCategoryId(id);
                            setActiveItem('category-settings');
                        }}
                    />
                </section>
            </div>

            <HistoryDrawer
                gameSlug={game.name}
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
            />
        </div>
    );
}
