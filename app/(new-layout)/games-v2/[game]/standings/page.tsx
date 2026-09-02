import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getMyBoardClaim } from '~src/lib/board-claims';
import { getGameActivityTimeseries } from '~src/lib/game-activity';
import { EMPTY_GAME_METADATA } from '~src/lib/game-metadata';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import { getQuickStats, resolveCategory, resolveGame } from '~src/lib/games-v1';
import { getRaceGameStatsByGame } from '~src/lib/races';
import { getGameStandings } from '~src/lib/standings';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type { ClaimCtaState } from '../claim/claim-cta';
import { GameHero } from '../header/game-hero';
import { isoDaysAgo, toSparklineSeries } from '../header/sparkline-data';
import { ViewTabs } from '../header/view-tabs';
import {
    dropStandingsCategories,
    orderStandingsForDisplay,
    standingsScope,
    standingsSections,
} from './order';
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
    if (
        process.env.NODE_ENV === 'production' &&
        !session?.roles?.includes('admin')
    )
        notFound();
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
            `/games-v2/${encodeURIComponent(resolvedGame.redirectedToSlug)}/standings`,
        );
    }

    const { categories: allCategories, groups: allGroups } =
        await resolveCategory(resolvedGame.id);
    // Level boards and their groups are out of scope entirely — see
    // standingsScope. Everything below reads the narrowed lists, exactly as it
    // read the raw ones before levels existed.
    const scope = standingsScope(allCategories, allGroups);
    const { categories, groups } = scope;
    const featured = categories.filter((c) => !c.archived && c.isMain);
    // Standings across a single category is just that category's board. Same
    // threshold decideGameRootView applies to the overview, so the tab band and
    // this route can't disagree about whether standings exist.
    if (featured.length < 2)
        redirect(`/games-v2/${encodeURIComponent(resolvedGame.name)}`);

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

    const [standings, quickStats, gameMeta, activity90, raceStats] =
        await Promise.all([
            getGameStandings(resolvedGame.id),
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
                activity={toSparklineSeries(activity90, 90)}
            />
            {/* No sidebar rail here: the matrix is the page, and the rail's
                340px is exactly the difference between a game's categories
                fitting and their tail hiding behind a scroll. */}
            <div>
                <div>
                    <ViewTabs
                        gameSlug={resolvedGame.name}
                        showRaces={(raceStats?.stats?.totalRaces ?? 0) > 0}
                    />
                    {standings.status === 'ok' ? (
                        <StandingsView
                            gameSlug={resolvedGame.name}
                            data={orderStandingsForDisplay(
                                dropStandingsCategories(
                                    standings.standings,
                                    scope.excludedIds,
                                ),
                                categories,
                                groups,
                            )}
                            sections={standingsSections(categories, groups)}
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
                                leaderboard. Try again shortly.
                            </p>
                        </div>
                    )}
                </div>
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
        description: `The top runners across every ${display} category, ranked by how close they get to each category's best time.`,
        images: await getGameImage(display),
    });
}
