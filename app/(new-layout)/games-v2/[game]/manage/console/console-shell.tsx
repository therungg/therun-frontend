'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from '~src/components/link';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../types/leaderboards.types';
import type { AttentionItem } from '../moderation/attention/attention-model';
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

    const handleSelect = (id: NavItemId) => {
        setActiveItem(id);
        setSidebarOpen(false);
    };

    const categoryOptions = useMemo(
        () => categories.map((c) => ({ id: c.id, display: c.display })),
        [categories],
    );

    const sidebar = (
        <ConsoleSidebar
            groups={groups}
            activeItem={activeItem}
            onSelect={handleSelect}
            attentionCount={attentionItems.length}
            categories={categoryOptions}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
        />
    );

    return (
        <div className="container-fluid py-3">
            <header className="d-flex align-items-center gap-2 mb-3">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary d-md-none"
                    aria-label="Toggle navigation"
                    aria-expanded={sidebarOpen}
                    onClick={() => setSidebarOpen((v) => !v)}
                >
                    ☰
                </button>
                <div>
                    <small className="text-muted d-block">Admin</small>
                    <h1 className="h4 mb-0">{game.display}</h1>
                </div>
                <Link
                    href={`/games-v2/${game.name}`}
                    className="btn btn-sm btn-outline-secondary ms-auto"
                >
                    Back to leaderboards
                </Link>
            </header>

            <div className="row g-3">
                <aside
                    className={`col-12 col-md-4 col-lg-3 ${sidebarOpen ? '' : 'd-none d-md-block'}`}
                >
                    {sidebar}
                </aside>
                <section className="col-12 col-md-8 col-lg-9">
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
                        historyOpen={historyOpen}
                        onHistoryClose={() => setHistoryOpen(false)}
                    />
                </section>
            </div>
        </div>
    );
}
