import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listManualTimes } from '~src/lib/moderation/manual-times';
import { ManualTimesView } from './manual-times-view';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function ManualTimesPage({ params }: Props) {
    const { game: slug } = await params;
    const session = await getSession();
    if (!session?.username) notFound();
    const game = await resolveGame(slug);
    if (!game) notFound();
    if (!canModerateGame(session, game.name)) notFound();

    const [rows, categoryData] = await Promise.all([
        listManualTimes(session.id, game.id).catch(() => []),
        resolveCategory(game.id).catch(() => ({ categories: [] })),
    ]);

    return (
        <ManualTimesView
            gameSlug={game.name}
            gameDisplay={game.display}
            rows={rows}
            categories={categoryData.categories.map((c) => ({
                id: c.id,
                display: c.display,
            }))}
        />
    );
}
