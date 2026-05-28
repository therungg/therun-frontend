import { subject as caslSubject } from '@casl/ability';
import { resolveCategory } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listManualTimes } from '~src/lib/moderation/manual-times';
import { listGameReports } from '~src/lib/moderation/reports';
import { listQueue } from '~src/lib/moderation/triage';
import { defineAbilityFor } from '~src/rbac/ability';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import type { User } from '../../../../../../types/session.types';
import { mergeAttention } from '../moderation/attention/attention-model';
import type { NavFlags } from './nav-model';

export interface ConsoleChromeData {
    categories: Array<{ id: number; display: string }>;
    flags: NavFlags;
    attentionCount: number;
}

/**
 * Shared loader for the persistent console chrome (sidebar gating + category
 * list + attention badge), used by the main console page AND every moderation
 * sub-route page so they render the same sidebar. Best-effort: a failed inbox
 * source degrades the badge to a lower count rather than erroring the page.
 */
export async function loadConsoleChrome(
    session: User,
    game: ResolvedGame,
): Promise<ConsoleChromeData> {
    const ability = defineAbilityFor(session);
    const flags: NavFlags = {
        canModerate: canModerateGame(session, game.name),
        canEditStandards: ability.can('edit', 'moderators'),
        canConfigure: ability.can(
            'edit',
            caslSubject('category-settings', { game: game.name }),
        ),
    };

    const { categories } = await resolveCategory(game.id);
    const categoryById = new Map(categories.map((c) => [c.id, c.display]));
    const categoryName = (id: number) =>
        categoryById.get(id) ?? `Category ${id}`;

    const [queueItems, reports, manualTimes] = await Promise.all([
        listQueue(session.id, game.id, { limit: 200 }).catch(() => null),
        listGameReports(session.id, game.id).catch(() => null),
        listManualTimes(session.id, game.id).catch(() => null),
    ]);
    const pendingClaims = (manualTimes ?? []).filter(
        (m) => m.verificationStatus === 'pending',
    );
    const attentionCount = mergeAttention(
        queueItems ?? [],
        reports ?? [],
        pendingClaims,
        categoryName,
    ).length;

    return {
        categories: categories.map((c) => ({ id: c.id, display: c.display })),
        flags,
        attentionCount,
    };
}
