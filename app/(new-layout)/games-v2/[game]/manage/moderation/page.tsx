import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listManualTimes } from '~src/lib/moderation/manual-times';
import { listGameReports } from '~src/lib/moderation/reports';
import { listQueue } from '~src/lib/moderation/triage';
import { defineAbilityFor } from '~src/rbac/ability';
import { mergeAttention } from './attention/attention-model';
import { ModerationTabs } from './moderation-tabs';

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
            // Inbox sources — best-effort; coerced to [] so a single
            // unreachable route degrades gracefully rather than erroring.
            listQueue(sessionId, game.id, { limit: 200 }).catch(() => null),
            listGameReports(sessionId, game.id).catch(() => null),
            listManualTimes(sessionId, game.id).catch(() => null),
        ]);

    const categoryById = new Map(categories.map((c) => [c.id, c.display]));
    const categoryName = (id: number) =>
        categoryById.get(id) ?? `Category ${id}`;

    const pendingClaims = (manualTimes ?? []).filter(
        (m) => m.verificationStatus === 'pending',
    );

    const items = mergeAttention(
        queueItems ?? [],
        reports ?? [],
        pendingClaims,
        categoryName,
    );

    // The Configure tab itself is visible to any moderator (the page gate above
    // already requires `canModerateGame`): mods can preview Standards, see the
    // Active bans list, lift bans, and read History. Only *editing* Standards is
    // gated — board-admins uniquely hold `edit` on `moderators` (board-moderators
    // and per-game moderators do not), so it cleanly expresses that edit gate.
    const canEditConfig = defineAbilityFor(session).can('edit', 'moderators');

    return (
        <ModerationTabs
            gameSlug={game.name}
            gameDisplay={game.display}
            canEditConfig={canEditConfig}
            items={items}
            categories={categories.map((c) => ({
                id: c.id,
                display: c.display,
            }))}
        />
    );
}
