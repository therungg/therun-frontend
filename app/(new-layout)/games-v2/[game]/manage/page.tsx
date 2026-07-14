import { subject as caslSubject } from '@casl/ability';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getSession } from '~src/actions/session.action';
import { listGameBoardClaims } from '~src/lib/board-claims';
import { listManageCategories, listManageGroups } from '~src/lib/category-mgmt';
import { getGameIdentifiers, getGameMetadata } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listGameVariables } from '~src/lib/leaderboard-variables';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listManualTimes } from '~src/lib/moderation/manual-times';
import { listPolicies } from '~src/lib/moderation/policies';
import { listGameReports } from '~src/lib/moderation/reports';
import { listQueue } from '~src/lib/moderation/triage';
import {
    type BoardCompleteness,
    categoryFactsFromResolved,
    computeCompleteness,
} from '~src/lib/setup/completeness';
import { defineAbilityFor } from '~src/rbac/ability';
import { isLowActivityCategory } from '~src/utils/format-stats';
import type { BoardClaimRequest } from '../../../../../types/board-claims.types';
import { ConsoleShell } from './console/console-shell';
import { mergeAttention } from './moderation/attention/attention-model';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function GameAdminConsolePage({ params }: Props) {
    const { game: slug } = await params;
    const session = await getSession();
    if (!session?.username || !session.id) notFound();

    const game = await resolveGame(slug);
    if (!game) notFound();

    const ability = defineAbilityFor(session);
    const canModerate = canModerateGame(session, game.name);
    const canConfigure = ability.can(
        'edit',
        caslSubject('category-settings', { game: game.name }),
    );
    const canEditStandards = ability.can('edit', 'moderators');
    const canReassign = ability.can('reassign', 'reassignment');
    const canEditMods = ability.can(
        'edit',
        caslSubject('moderators', { game: game.name }),
    );
    if (!canModerate && !canConfigure) notFound();

    const sessionId = session.id;
    const { categories } = await resolveCategory(game.id);
    const categoryById = new Map(categories.map((c) => [c.id, c.display]));
    const categoryName = (id: number) =>
        categoryById.get(id) ?? `Category ${id}`;

    const initialCategory =
        categories.find((c) => c.active !== false) ?? categories[0] ?? null;

    const [identifiers, rawRows, groups, queueItems, reports, manualTimes] =
        await Promise.all([
            getGameIdentifiers(game.id).catch(() => ({
                slug: null,
                abbreviation: null,
            })),
            listManageCategories(game.id).catch(() => []),
            listManageGroups(game.id).catch(() => []),
            listQueue(sessionId, game.id, { limit: 200 }).catch(() => null),
            listGameReports(sessionId, game.id).catch(() => null),
            listManualTimes(sessionId, game.id).catch(() => null),
        ]);

    const statsById = new Map(categories.map((c) => [c.id, c]));
    const rows = rawRows
        .map((r) => {
            const stats = statsById.get(r.id);
            return {
                ...r,
                totalRunTime: stats?.totalRunTime ?? 0,
                totalFinishedAttemptCount:
                    stats?.totalFinishedAttemptCount ?? 0,
                uniqueRunners: stats?.uniqueRunners ?? 0,
            };
        })
        .filter((r) => !isLowActivityCategory(r));

    const pendingClaims = (manualTimes ?? []).filter(
        (m) => m.verificationStatus === 'pending',
    );
    const attentionItems = mergeAttention(
        queueItems ?? [],
        reports ?? [],
        pendingClaims,
        categoryName,
    );

    let modApplications: BoardClaimRequest[] = [];
    if (canEditMods) {
        modApplications = await listGameBoardClaims(sessionId, game.id).catch(
            () => [],
        );
    }

    // The checklist card links into the configure-gated setup wizard, so only
    // compute it for viewers who can actually configure the board.
    let setupCompleteness: BoardCompleteness | null = null;
    if (canConfigure) {
        const [variables, policies, moderators, metadata] = await Promise.all([
            listGameVariables(sessionId, game.id).catch(() => []),
            listPolicies(sessionId, game.id).catch(() => []),
            listGameModerators(game.id).catch(() => []),
            getGameMetadata(game.id).catch(() => null),
        ]);
        if (metadata) {
            setupCompleteness = computeCompleteness({
                categories: categoryFactsFromResolved(categories),
                variableCount: variables.length,
                policyCount: policies.length,
                requireVideoAnywhere: categories.some(
                    (c) => c.active && c.requireVideo,
                ),
                slug: identifiers.slug,
                abbreviation: identifiers.abbreviation,
                moderatorCount: moderators.length,
                configured: metadata.configured,
            });
        }
    }

    return (
        <Suspense fallback={null}>
            <ConsoleShell
                game={game}
                categories={categories}
                flags={{
                    canModerate,
                    canEditStandards,
                    canConfigure,
                    canReassign,
                }}
                attentionItems={attentionItems}
                modApplications={modApplications}
                initialCategoryId={initialCategory?.id ?? null}
                initialSlug={identifiers.slug}
                initialAbbreviation={identifiers.abbreviation}
                initialRows={rows}
                initialGroups={groups}
                setupCompleteness={setupCompleteness}
            />
        </Suspense>
    );
}
