import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { listQueue } from '~src/lib/moderation/triage';
import type { QueueItem } from '../../../../../../../types/moderation.types';
import { QueueView } from './queue-view';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function QueuePage({ params }: Props) {
    const { game: slug } = await params;
    if (!slug) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const game = await resolveGame(slug);
    if (!game) notFound();
    if (!canModerateGame(session, game.name)) notFound();

    let items: QueueItem[];
    try {
        items = await listQueue(session.id, game.id, { limit: 100 });
    } catch (e) {
        if (e instanceof ModError) {
            // Empty / not-yet-registered route — render an empty queue rather
            // than 404 so the filter bar and refresh still work.
            items = [];
        } else {
            throw e;
        }
    }

    const { categories } = await resolveCategory(game.id);

    return (
        <QueueView
            gameSlug={game.name}
            gameDisplay={game.display}
            items={items}
            categories={categories.map((c) => ({
                id: c.id,
                display: c.display,
            }))}
        />
    );
}
