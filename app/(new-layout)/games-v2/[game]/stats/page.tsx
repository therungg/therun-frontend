import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getMyBoardClaim } from '~src/lib/board-claims';
import { getGameActivityTimeseries } from '~src/lib/game-activity';
import { EMPTY_GAME_METADATA } from '~src/lib/game-metadata';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import {
    getTopRunnersAllTime,
    getTopRunnersForPeriod,
} from '~src/lib/game-top-runners';
import { getQuickStats, resolveCategory, resolveGame } from '~src/lib/games-v1';
import { getGlobalStats } from '~src/lib/highlights';
import { getLeaderboardExport } from '~src/lib/leaderboards-v1';
import { getRaceGameStatsByGame } from '~src/lib/races';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import { getGameStandings } from '~src/lib/standings';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type { ResolvedCategory } from '../../../../../types/leaderboards.types';
import type { ClaimCtaState } from '../claim/claim-cta';
import { GameHero } from '../header/game-hero';
import { isoDaysAgo } from '../header/sparkline-data';
import { ViewTabs } from '../header/view-tabs';
import { ActivityChart } from './activity-chart';
import {
    BreakdownBars,
    type BreakdownRow,
    StackedSplit,
} from './breakdown-bars';
import { ColumnChart } from './column-chart';
import {
    type BoardEntries,
    categoryRows,
    emulatorSplit,
    newRunnerColumns,
    platformRows,
    timeHistogram,
} from './derive';
import styles from './stats.module.scss';
import { type DistributionBoard, TimeDistribution } from './time-distribution';
import { TopRunnersTable } from './top-runners-table';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
}

// The distributions sweep every featured board's export; cap the fan-out so
// a pathological game can't turn this page into dozens of full-board pulls.
const MAX_EXPORT_BOARDS = 12;

async function fetchBoardEntries(
    gameSlug: string,
    featured: ResolvedCategory[],
): Promise<BoardEntries[]> {
    const boards = featured.slice(0, MAX_EXPORT_BOARDS);
    const exports = await Promise.all(
        boards.map((c) =>
            getLeaderboardExport({
                gameSlug,
                categorySlug: c.name,
                timing: c.primaryTiming,
                subcategoryValues: {},
                combined: true,
                varFilters: {},
                verified: false,
            }).catch(() => null),
        ),
    );
    return boards.map((c, i) => ({
        slug: c.name,
        display: c.display ?? c.name,
        entries: exports[i]?.entries ?? [],
    }));
}

function medianTime(board: BoardEntries): string | null {
    const times = board.entries
        .map((e) => e.time)
        .filter((t): t is number => typeof t === 'number' && t > 0)
        .sort((a, b) => a - b);
    if (times.length === 0) return null;
    return formatTimeMs(times[Math.floor(times.length / 2)]);
}

export default async function GameStatsPage({ params }: PageProps) {
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
            `/games-v2/${encodeURIComponent(resolvedGame.redirectedToSlug)}/stats`,
        );
    }

    const { categories } = await resolveCategory(resolvedGame.id);
    const featured = categories.filter((c) => !c.archived && c.isMain);
    // Same threshold as standings: the tab band this page hangs off only
    // exists on the multi-category game root.
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

    const today = isoDaysAgo(0);
    const [
        quickStats,
        gameMeta,
        activity30,
        activity90,
        activityY1,
        runnersAllTime,
        runners90,
        runners30,
        boardEntries,
        standings,
        globalStats,
        raceStats,
    ] = await Promise.all([
        getQuickStats(resolvedGame.id).catch(() => ({
            totalRunTime: 0,
            totalAttemptCount: 0,
            totalFinishedAttemptCount: 0,
            totalPbs: 0,
            uniqueRunners: 0,
        })),
        getGameMetadata(resolvedGame.id).catch(() => EMPTY_GAME_METADATA),
        getGameActivityTimeseries(resolvedGame.id, isoDaysAgo(30), today).catch(
            () => [],
        ),
        getGameActivityTimeseries(resolvedGame.id, isoDaysAgo(90), today).catch(
            () => [],
        ),
        getGameActivityTimeseries(
            resolvedGame.id,
            isoDaysAgo(365),
            today,
            'week',
        ).catch(() => []),
        getTopRunnersAllTime(resolvedGame.id, 25).catch(() => []),
        getTopRunnersForPeriod(
            resolvedGame.id,
            isoDaysAgo(90),
            today,
            25,
        ).catch(() => []),
        getTopRunnersForPeriod(
            resolvedGame.id,
            isoDaysAgo(30),
            today,
            25,
        ).catch(() => []),
        fetchBoardEntries(resolvedGame.name, featured),
        getGameStandings(resolvedGame.id).catch(
            () => ({ status: 'error' }) as const,
        ),
        getGlobalStats().catch(() => null),
        getRaceGameStatsByGame(resolvedGame.display).catch(() => null),
    ]);

    const allEntries = boardEntries.flatMap((b) => b.entries);

    const countryRows: BreakdownRow[] = (() => {
        if (standings.status !== 'ok') return [];
        const counts = new Map<string, number>();
        for (const r of standings.standings.runners) {
            if (r.country) {
                counts.set(r.country, (counts.get(r.country) ?? 0) + 1);
            }
        }
        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([code, count]) => ({ label: code, count, country: code }));
    })();

    const split = emulatorSplit(allEntries);
    const platforms = platformRows(allEntries);
    const categorySplit = categoryRows(boardEntries);
    const newRunners = newRunnerColumns(boardEntries, 12);

    const distributionBoards: DistributionBoard[] = boardEntries
        .map((b) => ({
            slug: b.slug,
            display: b.display,
            columns: timeHistogram(b.entries, formatTimeMs),
            runs: b.entries.filter((e) => (e.time ?? 0) > 0).length,
            median: medianTime(b),
        }))
        .filter((b) => b.columns.length > 0)
        .sort((a, b) => b.runs - a.runs)
        .slice(0, 6);

    const siteShare =
        globalStats &&
        globalStats.totalRunTime > 0 &&
        quickStats.totalRunTime > 0
            ? (quickStats.totalRunTime / globalStats.totalRunTime) * 100
            : null;

    const completion =
        quickStats.totalAttemptCount > 0
            ? (quickStats.totalFinishedAttemptCount /
                  quickStats.totalAttemptCount) *
              100
            : null;

    const races = raceStats?.stats ?? null;
    const hasRaces = (races?.totalRaces ?? 0) > 0;

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
            {/* Full-width like standings: the chart and the table earn the
                rail's 340px more than the rail does here. */}
            <ViewTabs gameSlug={resolvedGame.name} showRaces={hasRaces} />

            {/* The figures the band above can't carry: rates and shares,
                which only mean anything next to their denominator. */}
            <section className={styles.panel}>
                <div className={styles.sectionHead}>
                    <span className={styles.sectionLabel}>At a glance</span>
                </div>
                <dl className={styles.statStrip}>
                    <div className={styles.stat}>
                        <dt className={styles.statLabel}>Completion rate</dt>
                        <dd className={styles.statValue}>
                            {completion === null
                                ? '—'
                                : `${completion < 10 ? completion.toFixed(1) : Math.round(completion)}%`}
                        </dd>
                        <p className={styles.statMeta}>
                            {quickStats.totalFinishedAttemptCount.toLocaleString()}{' '}
                            of {quickStats.totalAttemptCount.toLocaleString()}{' '}
                            attempts reached the end
                        </p>
                    </div>
                    <div className={styles.stat}>
                        <dt className={styles.statLabel}>Ranked runs</dt>
                        <dd className={styles.statValue}>
                            {allEntries.length.toLocaleString()}
                        </dd>
                        <p className={styles.statMeta}>
                            across {categorySplit.length || featured.length}{' '}
                            featured categories
                        </p>
                    </div>
                    {hasRaces && races && (
                        <div className={styles.stat}>
                            <dt className={styles.statLabel}>Races</dt>
                            <dd className={styles.statValue}>
                                {races.totalRaces.toLocaleString()}
                            </dd>
                            <p className={styles.statMeta}>
                                {Math.round(races.finishPercentage * 100)}% of
                                entrants finished
                            </p>
                        </div>
                    )}
                    {siteShare !== null && (
                        <div className={styles.stat}>
                            <dt className={styles.statLabel}>
                                Share of the site
                            </dt>
                            <dd className={styles.statValue}>
                                {siteShare >= 0.1
                                    ? siteShare.toFixed(1)
                                    : siteShare.toFixed(2)}
                                %
                            </dd>
                            <p className={styles.statMeta}>
                                of all playtime recorded on therun.gg
                            </p>
                        </div>
                    )}
                </dl>
            </section>

            <section className={styles.panel}>
                <div className={styles.sectionHead}>
                    <span className={styles.sectionLabel}>Activity</span>
                </div>
                <ActivityChart
                    d30={activity30}
                    d90={activity90}
                    y1={activityY1}
                />
            </section>

            <section className={styles.panel}>
                <div className={styles.sectionHead}>
                    <span className={styles.sectionLabel}>Top runners</span>
                </div>
                <TopRunnersTable
                    allTime={runnersAllTime}
                    d90={runners90}
                    d30={runners30}
                />
            </section>

            <div className={styles.pairGrid}>
                <section className={styles.panel}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionLabel}>PB times</span>
                    </div>
                    <TimeDistribution boards={distributionBoards} />
                </section>
                <section className={styles.panel}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionLabel}>New runners</span>
                        <span className={styles.sectionNote}>
                            last 12 months
                        </span>
                    </div>
                    <ColumnChart
                        columns={newRunners}
                        // Every third month, so the January that carries
                        // the year change actually gets a tick.
                        tickEvery={3}
                        unit="runners"
                        axisLabel="month of a runner's first ranked run"
                        empty="No first runs dated in the last year."
                    />
                </section>
            </div>

            {/* One panel, three small multiples: none of these is a topic on
                its own, and a head each made them look like three pages. */}
            <section className={styles.panel}>
                <div className={styles.sectionHead}>
                    <span className={styles.sectionLabel}>Breakdowns</span>
                    <span className={styles.sectionNote}>
                        {allEntries.length.toLocaleString()} ranked runs
                    </span>
                </div>
                <div className={styles.breakdownGrid}>
                    <div className={styles.breakdown}>
                        <span className={styles.breakdownLabel}>
                            Categories
                        </span>
                        <BreakdownBars rows={categorySplit} />
                    </div>
                    <div className={styles.breakdown}>
                        <span className={styles.breakdownLabel}>Platforms</span>
                        <BreakdownBars rows={platforms} />
                        {split && (
                            <StackedSplit
                                label="Hardware vs emulator"
                                a={{ label: 'Hardware', count: split.hardware }}
                                b={{ label: 'Emulator', count: split.emulator }}
                            />
                        )}
                    </div>
                    <div className={styles.breakdown}>
                        <span className={styles.breakdownLabel}>Countries</span>
                        <BreakdownBars rows={countryRows} />
                    </div>
                </div>
            </section>
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
        title: `${display} — Stats`,
        description: `Community statistics for ${display}: activity over time, most active runners, PB spread, and platform and country breakdowns.`,
        images: await getGameImage(display),
    });
}
