import React from 'react';
import { CategoryLeaderboard } from '~app/(new-layout)/games/[game]/game.types';
import detailStyles from '~app/(new-layout)/tournaments/[tournament]/tournament-detail.module.scss';
import { UserLink } from '../links/links';
import { Tournament } from '../tournament/tournament-info';
import { DurationToFormatted } from '../util/datetime';
import WrHistory from './wr-history';

export interface WrHistoryStat {
    timeHeldWr: number;
    improvedWr: number;
    user: string;
}

interface CumulativeStats {
    totalRunTime?: string | number;
    attemptCount?: number;
    finishedAttemptCount?: number;
    completePercentage?: number;
    totalPlayers?: number;
}

interface StatsData {
    wrHistory?: unknown[];
    wrHistoryStats?: WrHistoryStat[];
    stats?: CumulativeStats;
    runList?: unknown[];
}

interface Props {
    data?: StatsData | null;
    tournament: Tournament;
    gameTime?: boolean;
}

const StatCard = ({
    label,
    value,
    sub,
}: {
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
}) => (
    <div className={detailStyles.statsCard}>
        <span className={detailStyles.statsCardLabel}>{label}</span>
        <span className={detailStyles.statsCardValue}>{value}</span>
        {sub && <span className={detailStyles.statsCardSub}>{sub}</span>}
    </div>
);

export const TournamentStats: React.FC<Props> = ({
    data,
    tournament,
    gameTime = false,
}) => {
    if (!data) {
        return <div className={detailStyles.lbEmpty}>Loading stats…</div>;
    }

    const leaderboards = (
        gameTime
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (tournament.leaderboards as any)?.gameTime
            : tournament.leaderboards
    ) as CategoryLeaderboard | undefined;

    const stats = data.stats ?? {};
    const players =
        leaderboards?.pbLeaderboard?.length ?? stats.totalPlayers ?? 0;

    const completion =
        typeof stats.completePercentage === 'number'
            ? `${(stats.completePercentage * 100).toFixed(1)}%`
            : '—';

    const wrHistory = (data.wrHistory ?? []) as Array<{
        user: string;
        endedAt: string;
        time: string;
    }>;
    const lastRecord = wrHistory[wrHistory.length - 1];
    const tournamentEndMs = tournament.endDate
        ? Date.parse(tournament.endDate)
        : NaN;
    const recordHoldBoundaryMs = Number.isFinite(tournamentEndMs)
        ? Math.min(tournamentEndMs, Date.now())
        : Date.now();

    const wrStats = (data.wrHistoryStats ?? [])
        .slice()
        .map((stat) => {
            if (
                lastRecord &&
                stat.user === lastRecord.user &&
                lastRecord.endedAt
            ) {
                const setMs = Date.parse(lastRecord.endedAt);
                if (Number.isFinite(setMs)) {
                    return {
                        ...stat,
                        timeHeldWr: Math.max(0, recordHoldBoundaryMs - setMs),
                    };
                }
            }
            return stat;
        })
        .sort((a, b) => (b.timeHeldWr ?? 0) - (a.timeHeldWr ?? 0));

    return (
        <div className={detailStyles.statsWrap}>
            <div className={detailStyles.statsCardRow}>
                <StatCard
                    label="Players"
                    value={players.toLocaleString()}
                    sub="participated"
                />
                <StatCard
                    label="Total playtime"
                    value={
                        stats.totalRunTime ? (
                            <DurationToFormatted
                                duration={stats.totalRunTime.toString()}
                            />
                        ) : (
                            '—'
                        )
                    }
                    sub="across all runs"
                />
                <StatCard
                    label="Total attempts"
                    value={(stats.attemptCount ?? 0).toLocaleString()}
                    sub="started runs"
                />
                <StatCard
                    label="Finished attempts"
                    value={(stats.finishedAttemptCount ?? 0).toLocaleString()}
                    sub="completed runs"
                />
                <StatCard
                    label="Completion"
                    value={completion}
                    sub="finished / attempted"
                />
            </div>

            <div className={detailStyles.statsGrid}>
                <section className={detailStyles.section}>
                    <header className={detailStyles.sectionHeader}>
                        <h2 className={detailStyles.sectionTitle}>
                            Tournament record holders
                            <span className={detailStyles.sectionEyebrow}>
                                {wrStats.length}{' '}
                                {wrStats.length === 1 ? 'holder' : 'holders'}
                            </span>
                        </h2>
                    </header>
                    {wrStats.length === 0 ? (
                        <div className={detailStyles.lbEmpty}>
                            No tournament record history yet.
                        </div>
                    ) : (
                        <ol className={detailStyles.lbList}>
                            {wrStats.map((stat, idx) => {
                                const placing = idx + 1;
                                const rankClass =
                                    placing === 1
                                        ? detailStyles.rankGold
                                        : placing === 2
                                          ? detailStyles.rankSilver
                                          : placing === 3
                                            ? detailStyles.rankBronze
                                            : '';
                                return (
                                    <li
                                        key={`${stat.user}-${stat.timeHeldWr}-${stat.improvedWr}`}
                                        className={`${detailStyles.wrRow} ${rankClass}`}
                                    >
                                        <span className={detailStyles.lbRank}>
                                            {placing}
                                        </span>
                                        <span className={detailStyles.lbUser}>
                                            <UserLink username={stat.user} />
                                        </span>
                                        <span className={detailStyles.wrCol}>
                                            <span
                                                className={
                                                    detailStyles.wrColLabel
                                                }
                                            >
                                                Held
                                            </span>
                                            <span
                                                className={
                                                    detailStyles.wrColValue
                                                }
                                            >
                                                <DurationToFormatted
                                                    duration={stat.timeHeldWr}
                                                />
                                            </span>
                                        </span>
                                        <span className={detailStyles.wrCol}>
                                            <span
                                                className={
                                                    detailStyles.wrColLabel
                                                }
                                            >
                                                Improved
                                            </span>
                                            <span
                                                className={
                                                    detailStyles.wrColValue
                                                }
                                            >
                                                <DurationToFormatted
                                                    duration={stat.improvedWr}
                                                />
                                            </span>
                                        </span>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </section>

                <section className={detailStyles.section}>
                    <header className={detailStyles.sectionHeader}>
                        <h2 className={detailStyles.sectionTitle}>
                            Tournament record progression
                        </h2>
                    </header>
                    {data.wrHistory && data.wrHistory.length > 0 ? (
                        <div className={detailStyles.wrHistoryWrap}>
                            <WrHistory
                                historyData={
                                    {
                                        worldRecords: data.wrHistory,
                                        wrStats: data.wrHistoryStats ?? [],
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    } as any
                                }
                                maxEnd={
                                    tournament.endDate
                                        ? new Date(tournament.endDate)
                                        : new Date()
                                }
                            />
                        </div>
                    ) : (
                        <div className={detailStyles.lbEmpty}>
                            No record history yet.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default TournamentStats;
