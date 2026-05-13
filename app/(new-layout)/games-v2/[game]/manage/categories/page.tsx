import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { listManageCategories } from '~src/lib/category-mgmt';
import { resolveGame } from '~src/lib/games-v1';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { CategoriesQuickManagePage } from './categories-page';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function GameCategoriesManagePage({ params }: Props) {
    const { game: slug } = await params;
    const user = await getSession();

    const game = await resolveGame(slug);
    if (!game) notFound();

    confirmPermission(user, 'edit', 'category-settings', { game: game.name });

    const rows = await listManageCategories(game.id).catch(() => []);

    return <CategoriesQuickManagePage game={game} initialRows={rows} />;
}
