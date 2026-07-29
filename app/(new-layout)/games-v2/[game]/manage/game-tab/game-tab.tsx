'use client';

import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { InvalidateCacheButton } from '../../header/invalidate-cache-button';
import { GroupsSection } from './groups-section';

// Cache has no sidebar item of its own — it rides along under Groups, so it
// still needs a stable, direct-linkable anchor.
const CACHE_ANCHOR = 'game-tab-cache';

interface Props {
    game: ResolvedGame;
    rows: ManageCategoryRow[];
    groups: ManageGroup[];
    onGroupsChange: (groups: ManageGroup[]) => void;
    onRowGroupChange: (
        categoryId: number,
        groupId: number | null,
        groupName: string | null,
    ) => void;
}

export function GameTab({
    game,
    rows,
    groups,
    onGroupsChange,
    onRowGroupChange,
}: Props) {
    return (
        <div>
            <GroupsSection
                game={game}
                groups={groups}
                rows={rows}
                onGroupsChange={onGroupsChange}
                onRowGroupChange={onRowGroupChange}
            />

            <section id={CACHE_ANCHOR} className="mb-4">
                <h2 className="h5 mb-2">Cache</h2>
                <p className="text-muted small mb-2">
                    Clear the cached leaderboards for this game. Next read of
                    each board will re-warm from Postgres.
                </p>
                <InvalidateCacheButton gameSlug={game.name} gameId={game.id} />
            </section>
        </div>
    );
}
