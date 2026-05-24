import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModerationHub } from './moderation-hub';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function ModerationHubPage({ params }: Props) {
    const { game: slug } = await params;
    if (!slug) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const game = await resolveGame(slug);
    if (!game) notFound();
    if (!canModerateGame(session, game.name)) notFound();

    const { categories } = await resolveCategory(game.id);

    return (
        <ModerationHub
            gameSlug={game.name}
            gameDisplay={game.display}
            categories={categories.map((c) => ({
                id: c.id,
                display: c.display,
            }))}
        />
    );
}
