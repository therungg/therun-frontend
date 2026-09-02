import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import type {
    GameStats,
    Race,
    RaceGameStatsByGame,
} from '~app/(new-layout)/races/races.types';
import { getSession } from '~src/actions/session.action';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { getMyBoardClaim } from '~src/lib/board-claims';
import { getGameActivityTimeseries } from '~src/lib/game-activity';
import { EMPTY_GAME_METADATA } from '~src/lib/game-metadata';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import { getQuickStats, resolveGame } from '~src/lib/games-v1';
import {
    getAllActiveRacesByGame,
    getPaginatedFinishedRacesByGame,
    getRaceGameStatsByGame,
    getTimeAndMmrLeaderboards,
} from '~src/lib/races';
import { defineAbilityFor } from '~src/rbac/ability';
import { formatHours } from '~src/utils/format-stats';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type { ClaimCtaState } from '../claim/claim-cta';
import gamePageStyles from '../game-page.module.scss';
import { GameHero } from '../header/game-hero';
import { isoDaysAgo, toSparklineSeries } from '../header/sparkline-data';
import { ViewTabs } from '../header/view-tabs';
import styles from './races.module.scss';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
}

// Per-category leaderboard fan-out cap, same spirit as the Stats tab's
// export cap.
const MAX_CATEGORY_BOARDS = 8;

/** The race API keys on the game's display name, percent-encoded. */
function raceGameKey(display: string): string {
    return encodeURIComponent(display);
}

function categoryName(c: GameStats): string {
    // displayValue is "Game#Category" for game#category rows.
    const idx = c.displayValue.indexOf('#');
    return idx >= 0 ? c.displayValue.slice(idx + 1) : c.displayValue;
}

function winnerOf(race: Race): string | null {
    return race.results?.find((r) => r.position === 1)?.name ?? null;
}

export default async function GameRacesPage({ params }: PageProps) {
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
            `/games-v2/${encodeURIComponent(resolvedGame.redirectedToSlug)}/races`,
        );
    }

    const gameKey = raceGameKey(resolvedGame.display);
    const raceStats: RaceGameStatsByGame | null = await getRaceGameStatsByGame(
        resolvedGame.display,
    ).catch(() => null);
    // No stats object at all = the race API has never seen this game.
    if (!raceStats?.stats || raceStats.stats.totalRaces < 1)
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

    const shownCategories = raceStats.categories.slice(0, MAX_CATEGORY_BOARDS);
    const [
        quickStats,
        gameMeta,
        activity90,
        recentRaces,
        activeRaces,
        categoryBoards,
    ] = await Promise.all([
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
        getPaginatedFinishedRacesByGame(1, 10, '', [], {
            game: resolvedGame.display,
        }).catch(() => null),
        getAllActiveRacesByGame(resolvedGame.display).catch(() => []),
        Promise.all(
            shownCategories.map((c) =>
                getTimeAndMmrLeaderboards(
                    resolvedGame.display,
                    categoryName(c),
                    1,
                    3,
                ).catch(() => ({ timeLeaderboards: [], mmrLeaderboards: [] })),
            ),
        ),
    ]);

    const s = raceStats.stats;
    const bandCells = [
        { label: 'Races', value: s.totalRaces.toLocaleString() },
        {
            label: 'Finish rate',
            value: `${Math.round(s.finishPercentage * 100)}%`,
        },
        { label: 'Hours raced', value: formatHours(s.totalRaceTime) },
    ];
    const visibleActive = (activeRaces ?? []).filter(
        (r) => !r.isTestRace && r.visible !== false,
    );

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
            <ViewTabs gameSlug={resolvedGame.name} showRaces />
            {/* Race-scale strip in the hero band's own vocabulary — the page's
                subject stated in numbers before any list. */}
            <div className={styles.raceBand}>
                {bandCells.map((c) => (
                    <div key={c.label} className={gamePageStyles.statCell}>
                        <span className={gamePageStyles.statBandValue}>
                            {c.value}
                        </span>
                        <span className={gamePageStyles.statBandLabel}>
                            {c.label}
                        </span>
                    </div>
                ))}
                <div className={gamePageStyles.statCell}>
                    <span className={gamePageStyles.statBandValue}>
                        <DurationToFormatted
                            duration={Math.round(s.averageRaceTime)}
                        />
                    </span>
                    <span className={gamePageStyles.statBandLabel}>
                        Avg race
                    </span>
                </div>
            </div>
            {visibleActive.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionLabel}>
                            Happening now
                        </span>
                    </div>
                    <ul className={styles.raceList}>
                        {visibleActive.map((r) => (
                            <li key={r.raceId} className={styles.raceRow}>
                                <Link
                                    href={`/races/${r.raceId}`}
                                    className={styles.raceName}
                                >
                                    {r.customName?.trim() ||
                                        r.displayCategory ||
                                        r.category}
                                </Link>
                                <span className={styles.raceMeta}>
                                    {r.participantCount}{' '}
                                    {r.participantCount === 1
                                        ? 'racer'
                                        : 'racers'}{' '}
                                    ·{' '}
                                    {r.status === 'progress'
                                        ? 'in progress'
                                        : r.status === 'starting'
                                          ? 'starting'
                                          : 'open entry'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
            {shownCategories.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionLabel}>By category</span>
                        {raceStats.categories.length >
                            shownCategories.length && (
                            <span className={styles.sectionNote}>
                                showing {shownCategories.length} of{' '}
                                {raceStats.categories.length}
                            </span>
                        )}
                    </div>
                    <div className={styles.categoryGrid}>
                        {shownCategories.map((c, i) => (
                            <div
                                key={c.displayValue}
                                className={styles.categoryCard}
                            >
                                <h3 className={styles.categoryTitle}>
                                    {categoryName(c)}
                                </h3>
                                <p className={styles.categoryStats}>
                                    {c.totalRaces.toLocaleString()} races ·{' '}
                                    {Math.round(c.finishPercentage * 100)}%
                                    finish ·{' '}
                                    <DurationToFormatted
                                        duration={Math.round(c.averageRaceTime)}
                                    />{' '}
                                    avg
                                </p>
                                <div className={styles.podia}>
                                    <RacePodium
                                        title="Best times"
                                        rows={categoryBoards[
                                            i
                                        ].timeLeaderboards.map((t) => ({
                                            user: t.user,
                                            value: (
                                                <DurationToFormatted
                                                    duration={t.time}
                                                />
                                            ),
                                        }))}
                                    />
                                    <RacePodium
                                        title="Best rating"
                                        rows={categoryBoards[
                                            i
                                        ].mmrLeaderboards.map((m) => ({
                                            user: m.user,
                                            value: Math.round(
                                                m.mmr,
                                            ).toLocaleString(),
                                        }))}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
            <section className={styles.section}>
                <div className={styles.sectionHead}>
                    <span className={styles.sectionLabel}>Recent races</span>
                    <Link
                        href={`/races/stats/${gameKey}`}
                        className={gamePageStyles.quietLink}
                    >
                        Full race stats
                    </Link>
                </div>
                {!recentRaces || recentRaces.items.length === 0 ? (
                    <p className={styles.sectionNote}>
                        No finished races recorded.
                    </p>
                ) : (
                    <ul className={styles.raceList}>
                        {recentRaces.items.map((r) => {
                            const winner = winnerOf(r);
                            return (
                                <li key={r.raceId} className={styles.raceRow}>
                                    <Link
                                        href={`/races/${r.raceId}`}
                                        className={styles.raceName}
                                    >
                                        {r.customName?.trim() ||
                                            r.displayCategory ||
                                            r.category}
                                    </Link>
                                    <span className={styles.raceMeta}>
                                        {r.endTime && (
                                            <>
                                                {new Date(
                                                    r.endTime,
                                                ).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    timeZone: 'UTC',
                                                })}{' '}
                                                ·{' '}
                                            </>
                                        )}
                                        {r.participantCount}{' '}
                                        {r.participantCount === 1
                                            ? 'racer'
                                            : 'racers'}
                                        {winner && (
                                            <>
                                                {' · won by '}
                                                <span
                                                    className={
                                                        styles.raceWinner
                                                    }
                                                >
                                                    {winner}
                                                </span>
                                                {r.firstFinishedParticipantTime && (
                                                    <>
                                                        {' in '}
                                                        <DurationToFormatted
                                                            duration={
                                                                r.firstFinishedParticipantTime
                                                            }
                                                        />
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}

function RacePodium({
    title,
    rows,
}: {
    title: string;
    rows: { user: string; value: ReactNode }[];
}) {
    if (rows.length === 0) return null;
    return (
        <div className={styles.podium}>
            <span className={styles.podiumTitle}>{title}</span>
            <ol className={styles.podiumList}>
                {rows.map((r) => (
                    <li key={r.user} className={styles.podiumRow}>
                        <span className={styles.podiumUser}>{r.user}</span>
                        <span className={styles.podiumValue}>{r.value}</span>
                    </li>
                ))}
            </ol>
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
        title: `${display} — Races`,
        description: `Race statistics for ${display}: active and recent races, best race times, and rating leaderboards.`,
        images: await getGameImage(display),
    });
}
