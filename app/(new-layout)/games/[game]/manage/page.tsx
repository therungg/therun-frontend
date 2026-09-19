import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getSession } from '~src/actions/session.action';
import styles from '~src/components/console-chrome/console.module.scss';
import { canSeeBoards } from '~src/lib/board-access';
import { listGameBoardClaims } from '~src/lib/board-claims';
import { loadConsoleCatalog } from '~src/lib/category-mgmt';
import {
    buildCategoryRows,
    type CategoryConfigRow,
} from '~src/lib/console/category-rows';
import { keepConsoleRow } from '~src/lib/console/keep-console-row';
import { getConsoleGameMetadata, getGameIdentifiers } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listCategoryVariables } from '~src/lib/leaderboard-variables';
import {
    canConfigureGame,
    canEditGameIdentity,
    canModerateGame,
} from '~src/lib/moderation/can-moderate';
import { listPolicies } from '~src/lib/moderation/policies';
import { getVerificationSettings } from '~src/lib/moderation/verification-settings';
import { getWorklist, getWorklistDigest } from '~src/lib/moderation/worklist';
import {
    type BoardCompleteness,
    computeCompleteness,
} from '~src/lib/setup/completeness';
import { buildCompletenessInput } from '~src/lib/setup/completeness-input';
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
import type {
    WorklistDigest,
    WorklistPage,
} from '../../../../../types/worklist.types';
import { ConsoleShell } from './console/console-shell';
import type { GameDetailsData } from './console/game-details-pane';
import { streamWithin } from './console/stream-budget';
import { loadModDoorClaim, ModDoor } from './mod-door';
import {
    ATTENTION_UNAVAILABLE,
    loadAttention,
} from './moderation/attention/load-attention';

export const maxDuration = 60;

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
        return (
            <ModDoor
                game={game}
                claim={null}
                boardsVisible={canSeeBoards(session)}
            />
        );
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
                boardsVisible={canSeeBoards(session)}
            />
        );
    }

    const sessionId = session.id;
    // `boardGroups` is the same ResolvedGroup[] the wizard's BoardCuration
    // uses — comes free from this call, distinct from `groups` below
    // (ManageGroup[], fetched separately for the overview).
    const { categories, groups: boardGroups } = await resolveCategory(game.id);
    const categoryById = new Map(categories.map((c) => [c.id, c.display]));
    const categoryName = (id: number) =>
        categoryById.get(id) ?? `Category ${id}`;

    // The mod queue is the slowest thing this page can ask for — on a big
    // board the worklist and the flags inbox each re-rank every pending run,
    // which runs into tens of seconds. None of it is awaited here: the
    // promises go straight to the console, which streams them in behind
    // Suspense so the rest of the page renders at the speed of the cheap
    // calls below.
    // `streamWithin` is what makes that safe: it turns a throw or a call
    // slower than the budget into the same "didn't load" value the catch
    // fallbacks always produced, so the stream finishes and the skeletons
    // resolve into something honest instead of spinning to `maxDuration`.
    const worklistPromise = canModerate
        ? streamWithin<WorklistPage | null>(
              () => getWorklist(sessionId, game.id, { pageSize: 5 }),
              null,
          )
        : Promise.resolve(null);
    const digestPromise = canModerate
        ? streamWithin<WorklistDigest | null>(
              () => getWorklistDigest(sessionId, game.id, 7),
              null,
          )
        : Promise.resolve(null);
    // Flags, reports and self-claims: the Needs attention inbox and its
    // sidebar badge. `loadAttention` keeps each source's failure visible
    // instead of erroring the page.
    const attentionPromise = streamWithin(
        () => loadAttention(sessionId, game.id, categoryName),
        ATTENTION_UNAVAILABLE,
    );

    // Everything the page itself waits for, in one round. Each of these
    // depends on nothing but the session, the game and the category list
    // resolved above, so staging them — as this page did, in four sequential
    // rounds — only added round trips. Permission-gated entries resolve to
    // their empty value rather than being skipped, so the tuple keeps its
    // shape. Every call keeps its own best-effort fallback.
    const [
        identifiers,
        catalog,
        syncJob,
        settingsJob,
        runsJob,
        modApplications,
        variables,
        policies,
        gameMods,
        metadata,
        verificationConfigured,
    ] = await Promise.all([
        getGameIdentifiers(game.id).catch(() => ({
            slug: null,
        })),
        // Rows and groups both come off pageData — one load, not two.
        loadConsoleCatalog(game.id).catch(() => ({
            rows: [],
            groups: [],
        })),
        // The board's latest import job — feeds the overview's Import &
        // sync card. Best-effort: a failure just renders the "no import"
        // state.
        getSrcImportJob(sessionId, game.id).catch(() => null),
        // Per-kind latest jobs — the overview's import card shows one
        // "last import" line for settings and one for runs.
        getSrcImportJob(sessionId, game.id, 'settings').catch(() => null),
        getSrcImportJob(sessionId, game.id, 'resync').catch(() => null),
        canEditMods
            ? listGameBoardClaims(sessionId, game.id).catch(
                  (): BoardClaimRequest[] => [],
              )
            : Promise.resolve<BoardClaimRequest[]>([]),
        // Variables + policies feed the index matrix (configure-only) AND the
        // Boards pane — fetched unconditionally because a viewer who can do
        // neither never reaches this far (see the ModDoor return above), so a
        // moderator without configure still gets the real board.
        listCategoryVariables(
            sessionId,
            game.id,
            categories.map((c) => c.id),
        ).catch((): VariableRow[] => []),
        listPolicies(sessionId, game.id).catch((): BoardPolicyRow[] => []),
        canConfigure
            ? listGameModerators(game.id).catch((): GameModerator[] => [])
            : Promise.resolve<GameModerator[]>([]),
        canConfigure
            ? getConsoleGameMetadata(game.id).catch(() => null)
            : Promise.resolve(null),
        // Gated on canModerate, not canConfigure — the backend's
        // verification-settings route checks verify-reject-run, the same
        // permission canModerateGame mirrors.
        canConfigure && canModerate
            ? getVerificationSettings(sessionId, game.id)
                  .then((v) => v.configured)
                  .catch(() => false)
            : Promise.resolve(false),
    ]);
    const { rows: rawRows, groups } = catalog;

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

    // The checklist card links into the configure-gated setup wizard, so only
    // compute it for viewers who can actually configure the board.
    let setupCompleteness: BoardCompleteness | null = null;
    let boardHealth: BoardHealth | null = null;
    let gameDetails: GameDetailsData | null = null;
    const moderators: GameModerator[] = gameMods;
    // The index matrix needs variables + policies whether or not metadata
    // loads, so they are read here rather than inside the metadata branch.
    let categoryConfig: CategoryConfigRow[] = buildCategoryRows({
        categories,
        policies: [],
        variables: [],
    });
    if (canConfigure) {
        categoryConfig = buildCategoryRows({ categories, policies, variables });
        if (metadata) {
            setupCompleteness = computeCompleteness(
                buildCompletenessInput({
                    categories,
                    groups: boardGroups,
                    variables,
                    policyCount: policies.length,
                    slug: identifiers.slug,
                    moderatorCount: moderators.length,
                    configured: metadata.configured,
                    hasTheme: metadata.theme != null,
                    verificationConfigured,
                    settingsJob,
                }),
            );
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
                canRematch: canEditGameIdentity(session, game.name),
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
                    boardsVisible: canSeeBoards(session),
                }}
                attention={attentionPromise}
                moderatedGamesCount={session.moderatedGames?.length ?? 0}
                modApplications={modApplications}
                initialRows={rows}
                categoryConfig={categoryConfig}
                initialGroups={groups}
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
                worklist={worklistPromise}
                digest={digestPromise}
            />
        </Suspense>
    );
}
