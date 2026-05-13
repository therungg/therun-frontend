import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getGameIdentifiers } from '~src/lib/game-mgmt';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listMinimumTimes } from '~src/lib/leaderboard-minimums';
import { getVariables } from '~src/lib/leaderboards-v1';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { ManagePage } from './manage-page';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function GameManagePage({ params }: Props) {
    const { game: slug } = await params;
    const user = await getSession();

    const game = await resolveGame(slug);
    if (!game) notFound();

    confirmPermission(user, 'edit', 'category-settings', { game: game.name });

    const { categories } = await resolveCategory(game.id);
    const initialCategory = categories[0] ?? null;

    const [initialIdentifiers, initialVariables, initialMinimums] =
        await Promise.all([
            getGameIdentifiers(game.id).catch(() => ({
                slug: null,
                abbreviation: null,
            })),
            initialCategory
                ? getVariables(game.name, initialCategory.name).catch(() => [])
                : Promise.resolve([]),
            initialCategory
                ? listMinimumTimes(user.id, game.id, initialCategory.id).catch(
                      () => [],
                  )
                : Promise.resolve([]),
        ]);

    return (
        <ManagePage
            data={{
                game,
                categories,
                initialCategoryId: initialCategory?.id ?? -1,
                initialVariables,
                initialMinimums,
                initialSlug: initialIdentifiers.slug,
                initialAbbreviation: initialIdentifiers.abbreviation,
            }}
        />
    );
}
