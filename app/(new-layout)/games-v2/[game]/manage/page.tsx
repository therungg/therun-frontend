import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getSession } from '~src/actions/session.action';
import { listGameBoardClaims } from '~src/lib/board-claims';
import { listManageCategories, listManageGroups } from '~src/lib/category-mgmt';
import { getGameIdentifiers, getGameMetadata } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listGameVariables } from '~src/lib/leaderboard-variables';
import {
    canConfigureGame,
    canModerateGame,
} from '~src/lib/moderation/can-moderate';
import { listManualTimes } from '~src/lib/moderation/manual-times';
import { listPolicies } from '~src/lib/moderation/policies';
import { listGameReports } from '~src/lib/moderation/reports';
import { listQueue } from '~src/lib/moderation/triage';
import {
    type BoardCompleteness,
    categoryFactsFromResolved,
    computeCompleteness,
} from '~src/lib/setup/completeness';
import { type BoardHealth, computeBoardHealth } from '~src/lib/setup/health';
import { defineAbilityFor } from '~src/rbac/ability';
import { isLowActivityCategory } from '~src/utils/format-stats';
import buildMetadata from '~src/utils/metadata';
import type {
    BoardClaimRequest,
    GameModerator,
} from '../../../../../types/board-claims.types';
import styles from './console/console.module.scss';
import { ConsoleShell } from './console/console-shell';
import type { GameDetailsData } from './console/game-details-pane';
import { loadModDoorClaim, ModDoor } from './mod-door';
import {
    degradedSourcesOf,
    mergeAttention,
    resolveSource,
} from './moderation/attention/attention-model';

interface Props {
    params: Promise<{ game: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { game: slug } = await params;
    const game = await resolveGame(slug);
    const display = game?.display ?? slug;
    return buildMetadata({
        title: `Manage — ${display}`,
        description: `Manage the ${display} leaderboard.`,
    });
}

export default async function GameAdminConsolePage({ params }: Props) {
    const { game: slug } = await params;

    const game = await resolveGame(slug);
    if (!game) notFound();

    const session = await getSession();
    if (!session?.username || !session.id) {
        return <ModDoor game={game} claim={null} />;
    }

    const ability = defineAbilityFor(session);
    const canModerate = canModerateGame(session, game.name);
    const canConfigure = canConfigureGame(session, game.name);
    const canEditStandards = ability.can('edit', 'moderators');
    const canReassign = ability.can('reassign', 'reassignment');
    const canEditMods = ability.can(
        'edit',
        caslSubject('moderators', { game: game.name }),
    );
    if (!canModerate && !canConfigure) {
        return (
            <ModDoor
                game={game}
                claim={await loadModDoorClaim(session.id, game.id)}
            />
        );
    }

    const sessionId = session.id;
    const { categories } = await resolveCategory(game.id);
    const categoryById = new Map(categories.map((c) => [c.id, c.display]));
    const categoryName = (id: number) =>
        categoryById.get(id) ?? `Category ${id}`;

    const initialCategory =
        categories.find((c) => !c.archived) ?? categories[0] ?? null;

    const [identifiers, rawRows, groups, queueRes, reportsRes, manualTimesRes] =
        await Promise.all([
            getGameIdentifiers(game.id).catch(() => ({
                slug: null,
            })),
            listManageCategories(game.id).catch(() => []),
            listManageGroups(game.id).catch(() => []),
            resolveSource(
                listQueue(sessionId, game.id, { limit: 200 }),
                'flags',
            ),
            resolveSource(listGameReports(sessionId, game.id), 'reports'),
            resolveSource(listManualTimes(sessionId, game.id), 'manual times'),
        ]);
    const degradedSources = degradedSourcesOf([
        queueRes,
        reportsRes,
        manualTimesRes,
    ]);
    const queueItems = queueRes.ok ? queueRes.data : [];
    const reports = reportsRes.ok ? reportsRes.data : [];
    const manualTimes = manualTimesRes.ok ? manualTimesRes.data : [];

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

    const pendingClaims = manualTimes.filter(
        (m) => m.verificationStatus === 'pending',
    );
    const attentionItems = mergeAttention(
        queueItems,
        reports,
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
    let boardHealth: BoardHealth | null = null;
    let gameDetails: GameDetailsData | null = null;
    let moderators: GameModerator[] = [];
    // Moderators load under canConfigure but the pane gates on canEditMods.
    // Safe because every edit-moderators holder also has category-settings:
    // backend deriveGameLists guarantees adminedGames ⊆ moderatedGames, and
    // the board-admin role grants both (src/rbac/ability.ts).
    if (canConfigure) {
        const [variables, policies, gameMods, metadata] = await Promise.all([
            listGameVariables(sessionId, game.id).catch(() => []),
            listPolicies(sessionId, game.id).catch(() => []),
            listGameModerators(game.id).catch(() => []),
            getGameMetadata(game.id).catch(() => null),
        ]);
        moderators = gameMods;
        if (metadata) {
            setupCompleteness = computeCompleteness({
                categories: categoryFactsFromResolved(categories),
                variableCount: variables.length,
                policyCount: policies.length,
                requireVideoAnywhere: categories.some(
                    (c) => !c.archived && c.requireVideo,
                ),
                slug: identifiers.slug,
                moderatorCount: moderators.length,
                configured: metadata.configured,
            });
            boardHealth = computeBoardHealth({
                completeness: setupCompleteness,
                attentionCreatedAts: attentionItems.map((a) => a.createdAt),
                now: Date.now(),
            });
            gameDetails = {
                identifiers,
                metadata,
                game: {
                    id: game.id,
                    name: game.name,
                    image: game.image ?? null,
                },
            };
        }
    }

    return (
        <Suspense
            fallback={
                <div className={styles.shell}>
                    <div className={styles.fallback} />
                </div>
            }
        >
            <ConsoleShell
                game={game}
                categories={categories}
                flags={{
                    canModerate,
                    canEditStandards,
                    canConfigure,
                    canReassign,
                    canEditMods,
                }}
                attentionItems={attentionItems}
                degradedSources={degradedSources}
                moderatedGamesCount={session.moderatedGames?.length ?? 0}
                modApplications={modApplications}
                initialCategoryId={initialCategory?.id ?? null}
                initialSlug={identifiers.slug}
                initialRows={rows}
                initialGroups={groups}
                setupCompleteness={setupCompleteness}
                boardHealth={boardHealth}
                gameDetails={gameDetails}
                moderators={moderators}
            />
        </Suspense>
    );
}
