import { subject as caslSubject } from '@casl/ability';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getGameIdentifiers, getGameMetadata } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import { getQuickStats, resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listGameVariables } from '~src/lib/leaderboard-variables';
import { getLeaderboard } from '~src/lib/leaderboards-v1';
import { listPolicies } from '~src/lib/moderation/policies';
import {
    categoryFactsFromResolved,
    computeCompleteness,
    SETUP_STEP_ORDER,
    type SetupStepId,
} from '~src/lib/setup/completeness';
import { defineAbilityFor } from '~src/rbac/ability';
import { safeDecodeURI } from '~src/utils/uri';
import type { WizardData } from './types';
import { WizardShell } from './wizard-shell';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<{ step?: string }>;
}

const WR_FETCH_CAP = 10;

export default async function SetupPage({ params, searchParams }: PageProps) {
    const { game: gameParam } = await params;
    const { step } = await searchParams;
    if (!gameParam) notFound();

    const session = await getSession();
    const game = await resolveGame(safeDecodeURI(gameParam));
    if (!game) notFound();

    const ability = defineAbilityFor(session);
    const canConfigure = ability.can(
        'edit',
        caslSubject('category-settings', { game: game.name }),
    );
    if (!canConfigure) notFound();

    const [
        stats,
        catData,
        variables,
        policies,
        moderators,
        identifiers,
        metadata,
    ] = await Promise.all([
        getQuickStats(game.id),
        resolveCategory(game.id),
        listGameVariables(session.id, game.id),
        listPolicies(session.id, game.id),
        listGameModerators(game.id),
        getGameIdentifiers(game.id),
        getGameMetadata(game.id),
    ]);

    // Fastest verified time per active category (for min-time suggestions).
    const activeCats = catData.categories
        .filter((c) => c.active)
        .slice(0, WR_FETCH_CAP);
    const wrTimes: Record<number, number | null> = {};
    await Promise.all(
        activeCats.map(async (c) => {
            try {
                const lb = await getLeaderboard({
                    gameSlug: game.name,
                    categorySlug: c.name,
                    timing: c.primaryTiming,
                    verified: true,
                    pageSize: 1,
                });
                wrTimes[c.id] = lb.ok
                    ? (lb.result.entries[0]?.time ?? null)
                    : null;
            } catch {
                wrTimes[c.id] = null;
            }
        }),
    );

    const completeness = computeCompleteness({
        categories: categoryFactsFromResolved(catData.categories),
        variableCount: variables.length,
        policyCount: policies.length,
        requireVideoAnywhere: catData.categories.some(
            (c) => c.active && c.requireVideo,
        ),
        slug: identifiers.slug,
        abbreviation: identifiers.abbreviation,
        moderatorCount: moderators.length,
        configured: metadata.configured,
    });

    const data: WizardData = {
        game,
        stats,
        categories: catData.categories,
        groups: catData.groups,
        variables,
        policies,
        moderators,
        identifiers,
        metadata,
        completeness,
        wrTimes,
    };

    const initialStep: SetupStepId =
        step && SETUP_STEP_ORDER.includes(step as SetupStepId)
            ? (step as SetupStepId)
            : (completeness.firstIncomplete ?? 'welcome');

    return <WizardShell data={data} initialStep={initialStep} />;
}
