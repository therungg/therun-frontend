'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../types/leaderboards.types';
import type { AttentionItem } from '../moderation/attention/attention-model';
import { HistoryDrawer } from '../moderation/configure/history-drawer';
import { ConsoleChrome } from './console-chrome';
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
    const searchParams = useSearchParams();

    // A `?pane=` deep-link (used by sub-route pages navigating back) wins over
    // the default landing pane — but only if it's a pane this viewer can see.
    const initialActive = useMemo<NavItemId | null>(() => {
        const requested = searchParams.get('pane');
        const visible = groups.flatMap((g) => g.items).map((it) => it.id);
        // `history` is an overlay, not a content pane — never a landing target.
        if (
            requested &&
            requested !== 'history' &&
            visible.includes(requested as NavItemId)
        ) {
            return requested as NavItemId;
        }
        return defaultItem(groups);
    }, [searchParams, groups]);

    const [activeItem, setActiveItem] = useState<NavItemId | null>(
        initialActive,
    );
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
        initialCategoryId,
    );
    const [rows, setRows] = useState<ManageCategoryRow[]>(initialRows);
    const [manageGroups, setManageGroups] =
        useState<ManageGroup[]>(initialGroups);
    const [historyOpen, setHistoryOpen] = useState(false);

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

    // History is a quick-reference overlay, not a destination pane.
    const handleNavigate = (id: NavItemId) => {
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
        <>
            <ConsoleChrome
                game={game}
                groups={groups}
                activeItem={activeItem}
                onNavigate={handleNavigate}
                attentionCount={attentionItems.length}
                categories={categoryOptions}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
            >
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
            </ConsoleChrome>

            <HistoryDrawer
                gameSlug={game.name}
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
            />
        </>
    );
}
