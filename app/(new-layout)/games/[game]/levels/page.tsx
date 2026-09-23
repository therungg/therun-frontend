import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { canSeeBoards } from '~src/lib/board-access';
import { getMyBoardClaim } from '~src/lib/board-claims';
import { getGameActivityTimeseries } from '~src/lib/game-activity';
import { EMPTY_GAME_METADATA } from '~src/lib/game-metadata';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import { getQuickStats, resolveCategory, resolveGame } from '~src/lib/games-v1';
import { getRaceGameStatsByGame } from '~src/lib/races';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type { ClaimCtaState } from '../claim/claim-cta';
import { hasExtensions, splitExtensions } from '../extensions/scope';
import { GameHero } from '../header/game-hero';
import { isoDaysAgo, toSparklineSeries } from '../header/sparkline-data';
import { ViewTabs } from '../header/view-tabs';
import { hasStandings, hasStats } from '../standings/order';
import { SubmitDialogProvider } from '../submit-dialog/submit-dialog-context';
import { toInitialSearch } from '../submit-dialog/submit-params';
import type { GamePageSearchParams } from '../types';
import { loadLevelsData } from './data';
import { LevelsView } from './levels-view';
import { hasLevels, levelSections } from './order';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<GamePageSearchParams>;
}

export default async function GameLevelsPage({
    params,
    searchParams,
}: PageProps) {
    const { game } = await params;
    const sp = await searchParams;
    if (!game) notFound();

    const session = await getSession();
    if (!canSeeBoards(session)) notFound();
    const sessionUsername =
        session?.username && session.username.length > 0
            ? session.username
            : null;

    const resolvedGame = await resolveGame(game);
    if (!resolvedGame) notFound();
    if (
        resolvedGame.redirectedToGameId != null &&
        resolvedGame.redirectedToSlug
    ) {
        permanentRedirect(
            `/games/${encodeURIComponent(resolvedGame.redirectedToSlug)}/levels`,
        );
    }

    const {
        categories: allCategories,
        groups: allGroups,
        categoryEntryCounts,
    } = await resolveCategory(resolvedGame.id);
    // The game's own levels. A merged-in Category Extensions board keeps its
    // levels on its own tab.
    const {
        own: { categories, groups },
    } = splitExtensions(allCategories, allGroups);
    // A game with no level boards has no Levels tab, so the route has nothing
    // to render — same shape as the standings route's threshold, so the tab
    // band and this page can't disagree about whether levels exist.
    if (!hasLevels(categories, groups))
        redirect(`/games/${encodeURIComponent(resolvedGame.name)}`);
    const levelBoards = levelSections(categories, groups).flatMap(
        (s) => s.boards,
    );

    const ability = defineAbilityFor(session);
    const canManage = ability.can(
        'edit',
        caslSubject('category-settings', { game: resolvedGame.name }),
    );
    const canModerate = ability.can(
        'edit',
        caslSubject('leaderboard', { game: resolvedGame.name }),
    );

    // Same claim computation as the root page.tsx, mirrored so the sidebar's
    // claim CTA and GameHero's claim state agree across the tabs.
    const moderators = await listGameModerators(resolvedGame.id);
    let claim: ClaimCtaState | null = null;
    if (sessionUsername && !canManage && !canModerate) {
        const myClaim = await getMyBoardClaim(
            session.id,
            resolvedGame.id,
        ).catch(() => null);
        claim = {
            gameId: resolvedGame.id,
            hasModerators: moderators.length > 0,
            myClaimPending: myClaim?.status === 'pending',
        };
    }

    const [levels, quickStats, gameMeta, activity90, raceStats] =
        await Promise.all([
            loadLevelsData(
                resolvedGame.name,
                categories,
                groups,
                categoryEntryCounts,
            ),
            getQuickStats(resolvedGame.id).catch(() => ({
                totalRunTime: 0,
                totalAttemptCount: 0,
                totalFinishedAttemptCount: 0,
                totalPbs: 0,
                uniqueRunners: 0,
            })),
            getGameMetadata(resolvedGame.id).catch(() => EMPTY_GAME_METADATA),
            getGameActivityTimeseries(
                resolvedGame.id,
                isoDaysAgo(90),
                isoDaysAgo(0),
            ).catch(() => []),
            getRaceGameStatsByGame(resolvedGame.display).catch(() => null),
        ]);

    return (
        // The hero's "Submit a run" needs a dialog on this page, holding the
        // level boards. Without one the link fell through to the root route,
        // whose wall leaves level boards out, so no level could be submitted
        // to from here.
        <SubmitDialogProvider
            game={resolvedGame}
            coverUrl={gameMeta.coverUrl}
            categories={levelBoards}
            groups={groups.filter((g) => g.kind === 'level')}
            gameRules={gameMeta.gameRules}
            emulatorPolicy={gameMeta.emulatorPolicy}
            vodFps={gameMeta.vodFps}
            canModerate={canModerate}
            sessionUsername={sessionUsername}
            initialSearch={toInitialSearch(sp)}
        >
            <GameHero
                game={resolvedGame}
                stats={quickStats}
                gameMeta={gameMeta}
                categorySlug={null}
                subcategoryKey=""
                canManage={canManage}
                canModerate={canModerate}
                claim={claim}
                activity={toSparklineSeries(activity90, 90)}
            />
            <ViewTabs
                gameSlug={resolvedGame.name}
                showLevels
                showExtensions={hasExtensions(allCategories, allGroups)}
                showStandings={hasStandings(categories, groups)}
                showStats={hasStats(categories)}
                showRaces={(raceStats?.stats?.totalRaces ?? 0) > 0}
            />
            <LevelsView gameSlug={resolvedGame.name} data={levels} />
        </SubmitDialogProvider>
    );
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { game } = await params;
    if (!game) return buildMetadata();
    const resolved = await resolveGame(game);
    const display = resolved?.display ?? safeDecodeURI(game);

    return buildMetadata({
        title: `${display} — Levels`,
        description: `Every individual level of ${display}, with the record on each and who holds it.`,
        images: await getGameImage(display),
    });
}
