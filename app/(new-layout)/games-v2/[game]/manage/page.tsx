import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getSession } from '~src/actions/session.action';
import { listManageCategories, listManageGroups } from '~src/lib/category-mgmt';
import { getGameIdentifiers } from '~src/lib/game-mgmt';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listMinimumTimes } from '~src/lib/leaderboard-minimums';
import { getVariables } from '~src/lib/leaderboards-v1';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { isLowActivityCategory } from '~src/utils/format-stats';
import { ManagePage } from './manage-page';
import type { ManageTab } from './types';

interface Props {
    params: Promise<{ game: string }>;
    searchParams: Promise<{ tab?: string; categoryId?: string }>;
}

export default async function GameManagePage({ params, searchParams }: Props) {
    const { game: slug } = await params;
    const { tab, categoryId: categoryIdParam } = await searchParams;
    const user = await getSession();

    const game = await resolveGame(slug);
    if (!game) notFound();

    confirmPermission(user, 'edit', 'category-settings', { game: game.name });

    const { categories } = await resolveCategory(game.id);

    const requestedCategoryId = categoryIdParam
        ? Number.parseInt(categoryIdParam, 10)
        : Number.NaN;
    const requested = Number.isFinite(requestedCategoryId)
        ? categories.find((c) => c.id === requestedCategoryId)
        : undefined;
    const firstActive = categories.find((c) => c.active !== false);
    const initialCategory = requested ?? firstActive ?? categories[0] ?? null;

    const initialTab: ManageTab = tab === 'category' ? 'category' : 'game';

    const [
        initialIdentifiers,
        initialVariables,
        initialMinimums,
        initialRows,
        initialGroups,
    ] = await Promise.all([
        getGameIdentifiers(game.id).catch(() => ({
            slug: null,
            abbreviation: null,
        })),
        initialCategory
            ? getVariables(game.name, initialCategory.name)
                  .then((r) => r.variables)
                  .catch(() => [])
            : Promise.resolve([]),
        initialCategory
            ? listMinimumTimes(user.id, game.id, initialCategory.id).catch(
                  () => [],
              )
            : Promise.resolve([]),
        listManageCategories(game.id).catch(() => []),
        listManageGroups(game.id).catch(() => []),
    ]);

    const statsById = new Map(categories.map((c) => [c.id, c]));
    const enrichedRows = initialRows
        .map((r) => {
            const stats = statsById.get(r.id);
            return {
                ...r,
                totalRunTime: stats?.totalRunTime ?? 0,
                totalFinishedAttemptCount:
                    stats?.totalFinishedAttemptCount ?? 0,
                uniqueRunners: stats?.uniqueRunners ?? 0,
            };
        })
        .filter((r) => !isLowActivityCategory(r));

    return (
        <Suspense fallback={null}>
            <ManagePage
                data={{
                    game,
                    categories,
                    initialCategoryId: initialCategory?.id ?? -1,
                    initialVariables,
                    initialMinimums,
                    initialSlug: initialIdentifiers.slug,
                    initialAbbreviation: initialIdentifiers.abbreviation,
                    initialRows: enrichedRows,
                    initialGroups,
                    initialTab,
                }}
            />
        </Suspense>
    );
}
