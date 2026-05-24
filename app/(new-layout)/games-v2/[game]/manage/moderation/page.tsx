import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listManualTimes } from '~src/lib/moderation/manual-times';
import { listGameReports } from '~src/lib/moderation/reports';
import { listQueue } from '~src/lib/moderation/triage';
import { ModerationHub } from './moderation-hub';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function ModerationHubPage({ params }: Props) {
    const { game: slug } = await params;
    if (!slug) notFound();

    const session = await getSession();
    if (!session?.username || !session.id) notFound();

    const game = await resolveGame(slug);
    if (!game) notFound();
    if (!canModerateGame(session, game.name)) notFound();

    const sessionId = session.id;
    const [{ categories }, queueItems, reports, manualTimes] =
        await Promise.all([
            resolveCategory(game.id),
            // Attention counts — best-effort; null while the routes are
            // unreachable, so the hub renders no badge rather than erroring.
            listQueue(sessionId, game.id, { limit: 200 }).catch(() => null),
            listGameReports(sessionId, game.id).catch(() => null),
            listManualTimes(sessionId, game.id).catch(() => null),
        ]);

    return (
        <ModerationHub
            gameSlug={game.name}
            gameDisplay={game.display}
            categories={categories.map((c) => ({
                id: c.id,
                display: c.display,
            }))}
            counts={{
                queue: queueItems?.length ?? null,
                reports: reports?.length ?? null,
                pendingClaims: manualTimes
                    ? manualTimes.filter(
                          (m) => m.verificationStatus === 'pending',
                      ).length
                    : null,
            }}
        />
    );
}
