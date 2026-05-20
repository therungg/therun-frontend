'use client';

import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { InvalidateCacheButton } from '../../header/invalidate-cache-button';
import { IdentifiersSection } from '../identifiers/identifiers-section';
import { CategoriesTable } from './categories-table';
import { GroupsSection } from './groups-section';

interface Props {
    game: ResolvedGame;
    initialSlug: string | null;
    initialAbbreviation: string | null;
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
    onEditCategory: (categoryId: number) => void;
}

export function GameTab({
    game,
    initialSlug,
    initialAbbreviation,
    rows,
    groups,
    onGroupsChange,
    onRowChange,
    onRowGroupChange,
    onEditCategory,
}: Props) {
    return (
        <div>
            <IdentifiersSection
                gameSlug={game.name}
                gameId={game.id}
                initialSlug={initialSlug}
                initialAbbreviation={initialAbbreviation}
            />

            <section className="mb-4">
                <h2 className="h5 mb-2">Cache</h2>
                <p className="text-muted small mb-2">
                    Clear the cached leaderboards for this game. Next read of
                    each board will re-warm from Postgres.
                </p>
                <InvalidateCacheButton gameSlug={game.name} gameId={game.id} />
            </section>

            <GroupsSection
                game={game}
                groups={groups}
                rows={rows}
                onGroupsChange={onGroupsChange}
                onRowGroupChange={onRowGroupChange}
            />

            <CategoriesTable
                game={game}
                rows={rows}
                groups={groups}
                onRowChange={onRowChange}
                onRowGroupChange={onRowGroupChange}
                onGroupCreated={(g) => onGroupsChange([...groups, g])}
                onEdit={onEditCategory}
            />
        </div>
    );
}
