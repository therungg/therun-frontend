'use client';

import { useEffect } from 'react';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { InvalidateCacheButton } from '../../header/invalidate-cache-button';
import { IdentifiersSection } from '../identifiers/identifiers-section';
import { CategoriesTable } from './categories-table';
import { GroupsSection } from './groups-section';
import type { ReorderChange } from './reorder-changes';

/** The three sidebar items that all land inside this one component. */
export type GameTabSection = 'groups' | 'categories-visibility' | 'identifiers';

// Stable anchors — one per sidebar item, plus Cache (which has no nav item
// of its own but still needs to be a direct-linkable, discoverable target).
const SECTION_ANCHOR: Record<GameTabSection, string> = {
    identifiers: 'game-tab-identifiers',
    groups: 'game-tab-groups',
    'categories-visibility': 'game-tab-categories-visibility',
};
const CACHE_ANCHOR = 'game-tab-cache';

interface Props {
    game: ResolvedGame;
    /** Which sidebar item routed here — GameTab never remounts switching
     * between these three, so this drives which section to scroll to. */
    activeSection: GameTabSection;
    initialSlug: string | null;
    rows: ManageCategoryRow[];
    groups: ManageGroup[];
    onGroupsChange: (groups: ManageGroup[]) => void;
    onRowChange: (
        categoryId: number,
        patch: { isMain?: boolean; active?: boolean },
    ) => void;
    onRowGroupChange: (
        categoryId: number,
        groupId: number | null,
        groupName: string | null,
    ) => void;
    onRowsReorder: (changes: ReorderChange[]) => void;
    onEditCategory: (categoryId: number) => void;
}

export function GameTab({
    game,
    activeSection,
    initialSlug,
    rows,
    groups,
    onGroupsChange,
    onRowChange,
    onRowGroupChange,
    onRowsReorder,
    onEditCategory,
}: Props) {
    // Scroll to the section matching the sidebar item that routed here, on
    // mount and on every subsequent switch between the three items. No rAF
    // deferral needed: the console shell's own pane-switch effect focuses
    // the (offscreen) pane heading with `preventScroll: true`, so it no
    // longer fights this scroll for the top of the pane.
    useEffect(() => {
        const anchorId = SECTION_ANCHOR[activeSection];
        document.getElementById(anchorId)?.scrollIntoView({ block: 'start' });
    }, [activeSection]);

    return (
        <div>
            <div id={SECTION_ANCHOR.identifiers}>
                <IdentifiersSection
                    gameSlug={game.name}
                    gameId={game.id}
                    initialSlug={initialSlug}
                />
            </div>

            <section id={CACHE_ANCHOR} className="mb-4">
                <h2 className="h5 mb-2">Cache</h2>
                <p className="text-muted small mb-2">
                    Clear the cached leaderboards for this game. Next read of
                    each board will re-warm from Postgres.
                </p>
                <InvalidateCacheButton gameSlug={game.name} gameId={game.id} />
            </section>

            <div id={SECTION_ANCHOR.groups}>
                <GroupsSection
                    game={game}
                    groups={groups}
                    rows={rows}
                    onGroupsChange={onGroupsChange}
                    onRowGroupChange={onRowGroupChange}
                />
            </div>

            <div id={SECTION_ANCHOR['categories-visibility']}>
                <CategoriesTable
                    game={game}
                    rows={rows}
                    groups={groups}
                    onRowChange={onRowChange}
                    onRowGroupChange={onRowGroupChange}
                    onRowsReorder={onRowsReorder}
                    onGroupCreated={(g) => onGroupsChange([...groups, g])}
                    onEdit={onEditCategory}
                />
            </div>
        </div>
    );
}
