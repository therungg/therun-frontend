import { subject as caslSubject } from '@casl/ability';
import { resolveCategory } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listManualTimes } from '~src/lib/moderation/manual-times';
import { listGameReports } from '~src/lib/moderation/reports';
import { listQueue } from '~src/lib/moderation/triage';
import { defineAbilityFor } from '~src/rbac/ability';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import type { User } from '../../../../../../types/session.types';
import {
    degradedSourcesOf,
    mergeAttention,
    resolveSource,
} from '../moderation/attention/attention-model';
import type { NavFlags } from './nav-model';

export interface ConsoleChromeData {
    categories: Array<{ id: number; display: string }>;
    flags: NavFlags;
    attentionCount: number;
    /** Human-readable names of inbox sources that failed to load — non-empty
     * means `attentionCount` may be an undercount (see the badge in
     * console-sidebar.tsx, which shows this honestly rather than silently). */
    degradedSources: string[];
    /** How many games this viewer moderates — the chrome only shows an "All
     * your games" link to the cross-game hub when there's more than one. */
    moderatedGamesCount: number;
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
        canReassign: ability.can('reassign', 'reassignment'),
        canEditMods: ability.can(
            'edit',
            caslSubject('moderators', { game: game.name }),
        ),
    };

    const { categories } = await resolveCategory(game.id);
    const categoryById = new Map(categories.map((c) => [c.id, c.display]));
    const categoryName = (id: number) =>
        categoryById.get(id) ?? `Category ${id}`;

    const [queueRes, reportsRes, manualTimesRes] = await Promise.all([
        resolveSource(listQueue(session.id, game.id, { limit: 200 }), 'flags'),
        resolveSource(listGameReports(session.id, game.id), 'reports'),
        resolveSource(listManualTimes(session.id, game.id), 'manual times'),
    ]);
    // A failed source degrades the badge to a lower (possibly zero) count
    // rather than erroring the page — this chrome only ever renders a
    // number, so there's no "All clear" claim to protect here. The badge
    // still surfaces `degradedSources` honestly (a "+" and a tooltip) rather
    // than silently presenting a possibly-wrong count as final.
    const degradedSources = degradedSourcesOf([
        queueRes,
        reportsRes,
        manualTimesRes,
    ]);
    const queueItems = queueRes.ok ? queueRes.data : [];
    const reports = reportsRes.ok ? reportsRes.data : [];
    const manualTimes = manualTimesRes.ok ? manualTimesRes.data : [];
    const pendingClaims = manualTimes.filter(
        (m) => m.verificationStatus === 'pending',
    );
    const attentionCount = mergeAttention(
        queueItems,
        reports,
        pendingClaims,
        categoryName,
    ).length;

    return {
        categories: categories.map((c) => ({ id: c.id, display: c.display })),
        flags,
        attentionCount,
        degradedSources,
        moderatedGamesCount: session.moderatedGames?.length ?? 0,
    };
}
