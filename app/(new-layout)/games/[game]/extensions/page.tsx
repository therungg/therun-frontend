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
import { GameHero } from '../header/game-hero';
import { isoDaysAgo, toSparklineSeries } from '../header/sparkline-data';
import { ViewTabs } from '../header/view-tabs';
import { loadBoardWall } from '../levels/data';
import { LevelsView } from '../levels/levels-view';
import { hasLevels } from '../levels/order';
import { hasStandings, hasStats } from '../standings/order';
import { SubmitDialogProvider } from '../submit-dialog/submit-dialog-context';
import { toInitialSearch } from '../submit-dialog/submit-params';
import type { GamePageSearchParams } from '../types';
import { extensionSections, hasExtensions, splitExtensions } from './scope';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<GamePageSearchParams>;
}

export default async function GameExtensionsPage({
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
            `/games/${encodeURIComponent(resolvedGame.redirectedToSlug)}/extensions`,
        );
    }

    const { categories, groups, categoryEntryCounts } = await resolveCategory(
        resolvedGame.id,
    );
    // A game with no extensions has no Category Extensions tab, so the route has nothing
    // to render — same shape as the standings route's threshold, so the tab
    // band and this page can't disagree about whether they exist.
    if (!hasExtensions(categories, groups))
        redirect(`/games/${encodeURIComponent(resolvedGame.name)}`);
    const { own, extensions } = splitExtensions(categories, groups);
    const sections = extensionSections(categories, groups);

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

    const [wall, quickStats, gameMeta, activity90, raceStats] =
        await Promise.all([
            loadBoardWall(resolvedGame.name, sections, categoryEntryCounts, sp),
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
        // boards this page lists. Without one the link fell through to the
        // root route, whose dialog only knows the game's own boards, so an
        // extensions board could not be submitted to from anywhere but its
        // own board page.
        <SubmitDialogProvider
            game={resolvedGame}
            coverUrl={gameMeta.coverUrl}
            categories={sections.flatMap((s) => s.boards)}
            groups={extensions.groups}
            gameRules={gameMeta.gameRules}
            emulatorPolicy={gameMeta.emulatorPolicy}
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
                siblingLink={{
                    label: resolvedGame.display,
                    href: `/games/${encodeURIComponent(resolvedGame.name)}`,
                }}
            />
            <ViewTabs
                gameSlug={resolvedGame.name}
                showLevels={hasLevels(own.categories, own.groups)}
                showExtensions
                onExtensions
                showStandings={hasStandings(categories, groups)}
                showStats={hasStats(categories)}
                showRaces={(raceStats?.stats?.totalRaces ?? 0) > 0}
            />
            <LevelsView
                gameSlug={resolvedGame.name}
                data={wall}
                showFigures={false}
                noun={{
                    one: 'category',
                    many: 'categories',
                    title: 'Categories',
                }}
            />
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
        title: `${display} — Category Extensions`,
        description: `The Category Extensions of ${display}, with the record on each and who holds it.`,
        images: await getGameImage(display),
    });
}
