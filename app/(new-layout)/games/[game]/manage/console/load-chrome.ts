import { subject as caslSubject } from '@casl/ability';
import { canSeeBoards } from '~src/lib/board-access';
import { resolveCategory } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { resolveModSummary } from '~src/lib/moderation/mod-summary';
import { defineAbilityFor } from '~src/rbac/ability';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import type { User } from '../../../../../../types/session.types';
import type { NavFlags } from './nav-model';

export interface ConsoleChromeData {
    categories: Array<{ id: number; display: string }>;
    flags: NavFlags;
    /** Runs in the Queue waiting on this moderator — the Queue badge. */
    queueCount: number;
    /** The queue could not be read — `queueCount` is 0, not a real total. */
    queueDegraded: boolean;
    /** How many games this viewer moderates — the chrome only shows an "All
     * your games" link to the cross-game hub when there's more than one. */
    moderatedGamesCount: number;
}

/**
 * Shared loader for the persistent console chrome (sidebar gating + category
 * list + Queue badge), used by every moderation sub-route page so it renders
 * the same sidebar as the console. Best-effort: a failed queue read marks the
 * badge degraded rather than erroring the page.
 */
export async function loadConsoleChrome(
    session: User,
    game: ResolvedGame,
): Promise<ConsoleChromeData> {
    const ability = defineAbilityFor(session);
    // Minimum time / Players credited are board standards — the configure
    // right, not the unscoped `edit moderators` ability (which is true for
    // anyone who admins ANY game, not just this one). canEditStandards and
    // canConfigure are the same check; kept as two flags because the nav
    // model already names them separately.
    const canConfigure = ability.can(
        'edit',
        caslSubject('category-settings', { game: game.name }),
    );
    const flags: NavFlags = {
        canModerate: canModerateGame(session, game.name),
        canEditStandards: canConfigure,
        canConfigure,
        canReassign: ability.can('reassign', 'reassignment'),
        canEditMods: ability.can(
            'edit',
            caslSubject('moderators', { game: game.name }),
        ),
        boardsVisible: canSeeBoards(session),
    };

    const [{ categories }, queue] = await Promise.all([
        resolveCategory(game.id),
        flags.canModerate
            ? resolveModSummary(session.id, game.id)
            : Promise.resolve({ count: 0, degraded: false }),
    ]);

    return {
        categories: categories.map((c) => ({ id: c.id, display: c.display })),
        flags,
        queueCount: queue.count,
        queueDegraded: queue.degraded,
        moderatedGamesCount: session.moderatedGames?.length ?? 0,
    };
}
