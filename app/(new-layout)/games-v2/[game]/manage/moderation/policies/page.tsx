import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listPolicies } from '~src/lib/moderation/policies';
import { PoliciesView } from './policies-view';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function PoliciesPage({ params }: Props) {
    const { game: slug } = await params;
    if (!slug) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const game = await resolveGame(slug);
    if (!game) notFound();
    if (!canModerateGame(session, game.name)) notFound();

    const [{ categories }, policies] = await Promise.all([
        resolveCategory(game.id),
        listPolicies(session.id, game.id),
    ]);

    return (
        <PoliciesView
            gameSlug={game.name}
            gameDisplay={game.display}
            categories={categories.map((c) => ({
                id: c.id,
                display: c.display,
            }))}
            policies={policies}
        />
    );
}
