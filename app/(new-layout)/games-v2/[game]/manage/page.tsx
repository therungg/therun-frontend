import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
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

    if (!initialCategory) {
        return (
            <ManagePage
                data={{
                    game,
                    categories: [],
                    initialCategoryId: -1,
                    initialVariables: [],
                    initialMinimums: [],
                }}
            />
        );
    }

    const [initialVariables, initialMinimums] = await Promise.all([
        getVariables(game.name, initialCategory.name).catch(() => []),
        listMinimumTimes(user.id, game.id, initialCategory.id).catch(() => []),
    ]);

    return (
        <ManagePage
            data={{
                game,
                categories,
                initialCategoryId: initialCategory.id,
                initialVariables,
                initialMinimums,
            }}
        />
    );
}
