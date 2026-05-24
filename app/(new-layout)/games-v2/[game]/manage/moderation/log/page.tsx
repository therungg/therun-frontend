import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listModActions } from '~src/lib/moderation/mass-mgmt';
import { LogView } from './log-view';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function LogPage({ params }: Props) {
    const { game: slug } = await params;
    if (!slug) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const game = await resolveGame(slug);
    if (!game) notFound();
    if (!canModerateGame(session, game.name)) notFound();

    const actions = await listModActions(session.id, game.id, { days: 90 });

    return (
        <LogView
            gameSlug={game.name}
            gameDisplay={game.display}
            actions={actions}
        />
    );
}
