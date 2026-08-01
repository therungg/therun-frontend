import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getMyBoardClaim } from '~src/lib/board-claims';
import { EMPTY_GAME_METADATA } from '~src/lib/game-metadata';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import {
    getQuickStats,
    getRecentPbs,
    resolveCategory,
    resolveGame,
} from '~src/lib/games-v1';
import { getUserRankingsByName } from '~src/lib/leaderboards-v1';
import { getGameStandings } from '~src/lib/standings';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type { ClaimCtaState } from '../claim/claim-cta';
import gamePageStyles from '../game-page.module.scss';
import { GameHero } from '../header/game-hero';
import { ViewTabs } from '../header/view-tabs';
import {
    filterPbsToFeatured,
    RECENT_PB_FETCH_LIMIT,
} from '../sidebar/featured-pbs';
import { Sidebar } from '../sidebar/sidebar';
import styles from './standings.module.scss';
import { StandingsView } from './standings-view';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
}

export default async function GameStandingsPage({ params }: PageProps) {
    const { game } = await params;
    if (!game) notFound();

    const session = await getSession();
    if (!session?.roles?.includes('admin')) notFound();
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
            `/games-v2/${resolvedGame.redirectedToSlug}/standings`,
        );
    }

    const { categories } = await resolveCategory(resolvedGame.id);
    const featured = categories.filter((c) => !c.archived && c.isMain);
    // Standings across a single category is just that category's board. Same
    // threshold decideGameRootView applies to the overview, so the tab band and
    // this route can't disagree about whether standings exist.
    if (featured.length < 2) redirect(`/games-v2/${resolvedGame.name}`);

    const ability = defineAbilityFor(session);
    const canManage = ability.can(
        'edit',
        caslSubject('category-settings', { game: resolvedGame.name }),
    );
    const canModerate = ability.can(
        'edit',
        caslSubject('leaderboard', { game: resolvedGame.name }),
    );

    // Same claim computation as the root page.tsx, mirrored so the
    // sidebar's claim CTA and GameHero's claim state agree with the
    // overview/board views for this game.
    const moderators = await listGameModerators(resolvedGame.id);
    let claim: ClaimCtaState | null = null;
    if (sessionUsername && !canManage && !canModerate) {
        const myClaim = await getMyBoardClaim(session.id, resolvedGame.id);
        claim = {
            gameId: resolvedGame.id,
            hasModerators: moderators.length > 0,
            myClaimPending: myClaim?.status === 'pending',
        };
    }

    const [standings, quickStats, gameMeta, recentPbs, rawYourRuns] =
        await Promise.all([
            getGameStandings(resolvedGame.id),
            getQuickStats(resolvedGame.id).catch(() => ({
                totalRunTime: 0,
                totalAttemptCount: 0,
                totalFinishedAttemptCount: 0,
                uniqueRunners: 0,
            })),
            getGameMetadata(resolvedGame.id).catch(() => EMPTY_GAME_METADATA),
            // Same fetch shape as the overview sidebar (loadGameOverviewData):
            // featured-only recent PBs, and the session's own rankings
            // narrowed to this game.
            getRecentPbs(resolvedGame.id, RECENT_PB_FETCH_LIMIT, {
                featuredOnly: true,
            }).catch(() => []),
            sessionUsername
                ? getUserRankingsByName(sessionUsername).catch(() => [])
                : Promise.resolve([]),
        ]);

    return (
        <div>
            <GameHero
                game={resolvedGame}
                stats={quickStats}
                gameMeta={gameMeta}
                categorySlug={null}
                subcategoryKey=""
                canManage={canManage}
                canModerate={canModerate}
                claim={claim}
            />
            <div className={gamePageStyles.grid}>
                <div className={gamePageStyles.colMain}>
                    <ViewTabs gameSlug={resolvedGame.name} />
                    {standings.status === 'ok' ? (
                        <StandingsView
                            gameSlug={resolvedGame.name}
                            data={standings.standings}
                        />
                    ) : standings.status === 'empty' ? (
                        <div className={styles.empty}>
                            <p className={styles.emptyTitle}>
                                No standings yet.
                            </p>
                            <p className={styles.emptyBody}>
                                Standings appear once this game&apos;s featured
                                categories have ranked runs.
                            </p>
                        </div>
                    ) : (
                        <div className={styles.empty}>
                            <p className={styles.emptyTitle}>
                                Standings couldn&apos;t be loaded.
                            </p>
                            <p className={styles.emptyBody}>
                                This is a problem on our end, not an empty
                                leaderboard — try again shortly.
                            </p>
                        </div>
                    )}
                </div>
                <aside className={gamePageStyles.rail}>
                    <Sidebar
                        game={resolvedGame}
                        yourRuns={rawYourRuns.filter(
                            (r) => r.gameSlug === resolvedGame.name,
                        )}
                        recentPbs={filterPbsToFeatured(recentPbs, featured)}
                        claim={claim}
                        about={gameMeta.summaryOverride ?? gameMeta.summary}
                    />
                </aside>
            </div>
        </div>
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
        title: `${display} — Standings`,
        description: `The top runners across every ${display} category, ranked by how close they get to each category's record.`,
        images: await getGameImage(display),
    });
}
