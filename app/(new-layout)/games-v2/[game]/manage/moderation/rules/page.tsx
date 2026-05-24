import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listExclusionRules } from '~src/lib/moderation/mass-mgmt';
import { RulesView } from './rules-view';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function RulesPage({ params }: Props) {
    const { game: slug } = await params;
    if (!slug) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const game = await resolveGame(slug);
    if (!game) notFound();
    if (!canModerateGame(session, game.name)) notFound();

    const rules = await listExclusionRules(session.id, game.id);

    return (
        <RulesView
            gameSlug={game.name}
            gameDisplay={game.display}
            rules={rules}
        />
    );
}
