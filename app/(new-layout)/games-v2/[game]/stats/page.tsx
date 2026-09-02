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
import { getGameStandings } from '~src/lib/standings';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type {
    LeaderboardExportEntry,
    ResolvedCategory,
} from '../../../../../types/leaderboards.types';
import type { ClaimCtaState } from '../claim/claim-cta';
import { GameHero } from '../header/game-hero';
import { isoDaysAgo, toSparklineSeries } from '../header/sparkline-data';
import { ViewTabs } from '../header/view-tabs';
import { ActivityChart } from './activity-chart';
import { BreakdownBars, type BreakdownRow } from './breakdown-bars';
import styles from './stats.module.scss';
import { TopRunnersTable } from './top-runners-table';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
}

// The distributions sweep every featured board's export; cap the fan-out so
// a pathological game can't turn this page into dozens of full-board pulls.
const MAX_EXPORT_BOARDS = 12;

async function fetchDistributionEntries(
    gameSlug: string,
    featured: ResolvedCategory[],
): Promise<LeaderboardExportEntry[]> {
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
    return exports.flatMap((e) => e?.entries ?? []);
}

function platformRows(entries: LeaderboardExportEntry[]): BreakdownRow[] {
    const counts = new Map<string, number>();
    for (const e of entries) {
        const p = e.platform?.trim();
        if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, count]) => ({ label, count }));
}

function emulatorRows(entries: LeaderboardExportEntry[]): BreakdownRow[] {
    let emulator = 0;
    let hardware = 0;
    for (const e of entries) {
        if (e.emulator === true) emulator++;
        else if (e.emulator === false) hardware++;
    }
    if (emulator + hardware === 0) return [];
    return [
        { label: 'Hardware', count: hardware },
        { label: 'Emulator', count: emulator },
    ].sort((a, b) => b.count - a.count);
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
        distributionEntries,
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
        fetchDistributionEntries(resolvedGame.name, featured),
        getGameStandings(resolvedGame.id).catch(
            () => ({ status: 'error' }) as const,
        ),
        getGlobalStats().catch(() => null),
        getRaceGameStatsByGame(resolvedGame.display).catch(() => null),
    ]);

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
            .slice(0, 12)
            .map(([code, count]) => ({ label: code, count, country: code }));
    })();

    const siteShare =
        globalStats &&
        globalStats.totalRunTime > 0 &&
        quickStats.totalRunTime > 0
            ? (quickStats.totalRunTime / globalStats.totalRunTime) * 100
            : null;

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
            {/* Full-width like standings: the chart and the table earn the
                rail's 340px more than the rail does here. */}
            <ViewTabs
                gameSlug={resolvedGame.name}
                showRaces={(raceStats?.stats?.totalRaces ?? 0) > 0}
            />
            <section className={styles.section}>
                <div className={styles.sectionHead}>
                    <span className={styles.sectionLabel}>Activity</span>
                </div>
                <ActivityChart
                    d30={activity30}
                    d90={activity90}
                    y1={activityY1}
                />
            </section>
            <section className={styles.section}>
                <div className={styles.sectionHead}>
                    <span className={styles.sectionLabel}>Top runners</span>
                </div>
                <TopRunnersTable
                    allTime={runnersAllTime}
                    d90={runners90}
                    d30={runners30}
                />
            </section>
            <div className={styles.breakdownGrid}>
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionLabel}>Platforms</span>
                    </div>
                    <BreakdownBars rows={platformRows(distributionEntries)} />
                </section>
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionLabel}>
                            Hardware vs emulator
                        </span>
                    </div>
                    <BreakdownBars rows={emulatorRows(distributionEntries)} />
                </section>
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionLabel}>
                            Runner countries
                        </span>
                    </div>
                    <BreakdownBars rows={countryRows} />
                </section>
            </div>
            {siteShare !== null && (
                <p className={styles.footnote}>
                    {resolvedGame.display} accounts for{' '}
                    {siteShare >= 0.1
                        ? siteShare.toFixed(1)
                        : siteShare.toFixed(2)}
                    % of all playtime recorded on therun.gg.
                </p>
            )}
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
        description: `Community statistics for ${display}: activity over time, most active runners, platform and country breakdowns.`,
        images: await getGameImage(display),
    });
}
