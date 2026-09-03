import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getSession } from '~src/actions/session.action';
import styles from '~src/components/console-chrome/console.module.scss';
import { listGameBoardClaims } from '~src/lib/board-claims';
import { loadConsoleCatalog } from '~src/lib/category-mgmt';
import {
    buildCategoryRows,
    type CategoryConfigRow,
} from '~src/lib/console/category-rows';
import { keepConsoleRow } from '~src/lib/console/keep-console-row';
import { getGameIdentifiers, getGameMetadata } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listCategoryVariables } from '~src/lib/leaderboard-variables';
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
    variableFactsFromRows,
} from '~src/lib/setup/completeness';
import { type BoardHealth, computeBoardHealth } from '~src/lib/setup/health';
import { getSrcImportJob } from '~src/lib/src-import';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata from '~src/utils/metadata';
import type {
    BoardClaimRequest,
    GameModerator,
} from '../../../../../types/board-claims.types';
import type { VariableRow } from '../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../types/moderation.types';
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
    // `boardGroups` is the same ResolvedGroup[] the wizard's BoardCuration
    // uses — comes free from this call, distinct from `groups` below
    // (ManageGroup[], fetched separately for the index/GameTab).
    const { categories, groups: boardGroups } = await resolveCategory(game.id);
    const categoryById = new Map(categories.map((c) => [c.id, c.display]));
    const categoryName = (id: number) =>
        categoryById.get(id) ?? `Category ${id}`;

    const [
        identifiers,
        catalog,
        queueRes,
        reportsRes,
        manualTimesRes,
        syncJob,
        settingsJob,
        runsJob,
    ] = await Promise.all([
        getGameIdentifiers(game.id).catch(() => ({
            slug: null,
        })),
        // Rows, groups and level categories all come off pageData — one load,
        // not three.
        loadConsoleCatalog(game.id).catch(() => ({
            rows: [],
            groups: [],
            levelTemplates: [],
        })),
        resolveSource(listQueue(sessionId, game.id, { limit: 200 }), 'flags'),
        resolveSource(listGameReports(sessionId, game.id), 'reports'),
        resolveSource(listManualTimes(sessionId, game.id), 'manual times'),
        // The board's latest import job — feeds the overview's Import & sync
        // card. Best-effort: a failure just renders the "no import" state.
        getSrcImportJob(sessionId, game.id).catch(() => null),
        // Per-kind latest jobs — the overview's import card shows one "last
        // import" line for settings and one for runs.
        getSrcImportJob(sessionId, game.id, 'settings').catch(() => null),
        getSrcImportJob(sessionId, game.id, 'resync').catch(() => null),
    ]);
    const { rows: rawRows, groups, levelTemplates } = catalog;
    const degradedSources = degradedSourcesOf([
        queueRes,
        reportsRes,
        manualTimesRes,
    ]);
    const queueItems = queueRes.ok ? queueRes.data : [];
    const reports = reportsRes.ok ? reportsRes.data : [];
    const manualTimes = manualTimesRes.ok ? manualTimesRes.data : [];

    const statsById = new Map(categories.map((c) => [c.id, c]));
    const resolvedIds = new Set(categories.map((c) => c.id));
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
        // `resolveCategory` has already applied the activity floor AND
        // unioned in every zero-stats board, so membership in its list is the
        // whole verdict — see keepConsoleRow. Re-running the floor here would
        // drop freshly materialised level boards (all-zero stats) while
        // keeping the below-floor junk it is meant to remove.
        .filter((r) => keepConsoleRow(r.id, resolvedIds));

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
    // Variables + policies feed the index matrix (configure-only) AND the
    // Boards pane (canModerate || canConfigure) — fetched here, once, so a
    // moderator without configure still gets the real board, not an empty one.
    let variables: VariableRow[] = [];
    let policies: BoardPolicyRow[] = [];
    if (canModerate || canConfigure) {
        [variables, policies] = await Promise.all([
            // Category-scoped only: one list call per category, merged flat.
            listCategoryVariables(
                sessionId,
                game.id,
                categories.map((c) => c.id),
            ).catch(() => []),
            listPolicies(sessionId, game.id).catch(() => []),
        ]);
    }
    // The index matrix needs variables + policies whether or not metadata
    // loads, so they are fetched above rather than inside the metadata branch.
    let categoryConfig: CategoryConfigRow[] = buildCategoryRows({
        categories,
        policies: [],
        variables: [],
    });
    if (canConfigure) {
        const [gameMods, metadata] = await Promise.all([
            listGameModerators(game.id).catch(() => []),
            getGameMetadata(game.id).catch(() => null),
        ]);
        moderators = gameMods;
        categoryConfig = buildCategoryRows({ categories, policies, variables });
        if (metadata) {
            setupCompleteness = computeCompleteness({
                categories: categoryFactsFromResolved(categories),
                policyCount: policies.length,
                requireVideoAnywhere: categories.some(
                    (c) => !c.archived && c.requireVideo,
                ),
                slug: identifiers.slug,
                moderatorCount: moderators.length,
                configured: metadata.configured,
                // Category groups only — each individual level is its own
                // kind:'level' group, but those are the "Levels" step, not
                // the category-grouping structure, so they must not inflate
                // the group count or trip the ungrouped-orphan blocker.
                groupCount: groups.filter((g) => g.kind !== 'level').length,
                ungroupedMainCount: categories.filter(
                    (c) =>
                        !c.archived && (c.isMain ?? false) && c.groupId == null,
                ).length,
                ...variableFactsFromRows(variables),
            });
            boardHealth = computeBoardHealth({
                completeness: setupCompleteness,
            });
            gameDetails = {
                identifiers,
                metadata,
                game: {
                    id: game.id,
                    name: game.name,
                    image: game.image ?? null,
                },
                canRematch: ability.can('edit', 'game'),
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
                    canSiteBan: ability.can('moderate', 'admins'),
                }}
                attentionItems={attentionItems}
                degradedSources={degradedSources}
                moderatedGamesCount={session.moderatedGames?.length ?? 0}
                modApplications={modApplications}
                initialRows={rows}
                categoryConfig={categoryConfig}
                initialGroups={groups}
                levelTemplates={levelTemplates}
                boardGroups={boardGroups}
                variables={variables}
                policies={policies}
                setupCompleteness={setupCompleteness}
                boardHealth={boardHealth}
                gameDetails={gameDetails}
                moderators={moderators}
                syncJob={syncJob}
                settingsJob={settingsJob}
                runsJob={runsJob}
            />
        </Suspense>
    );
}
