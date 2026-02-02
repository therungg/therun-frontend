import React, { useState } from 'react';
import { CombinedLeaderboardStat } from '~app/(old-layout)/tournaments/[tournament]/get-combined-tournament-leaderboard.component';
import { PaginatedGameLeaderboard } from '~src/components/game/paginated-game-leaderboard';
import { Tournament } from '~src/components/tournament/tournament-info';
import { DurationToFormatted } from '~src/components/util/datetime';

export const CombinedEventLeaderboards = ({
    tournaments,
    seedingTable,
}: {
    tournaments: Tournament[];
    seedingTable: CombinedLeaderboardStat[];
}) => {
    const [leaderboard, setLeaderboard] = useState('Seed');

    const metaLeaderboards = generateMetaDataCombinedLeaderboards(tournaments);

    return (
        <div>
            <h3>Event Leaderboards</h3>
            <div style={{ marginBottom: '1rem' }}>
                <select
                    className="form-select"
                    onChange={(e) => {
                        setLeaderboard(e.target.value);
                    }}
                >
                    <option key="Seed" title="Seed" value="Seed">
                        Provisional Seed
                    </option>
                    {tournaments.map((tournament) => {
                        return (
                            <option
                                key={tournament.name}
                                title={tournament.shortName}
                                value={tournament.name}
                            >
                                {tournament.shortName}
                            </option>
                        );
                    })}
                    <option key="Playtime" title="Playtime" value="Playtime">
                        Playtime
                    </option>
                    <option key="Attempts" title="Attempts" value="Attempts">
                        Attempts
                    </option>
                    <option
                        key="Finished Attempts"
                        title="Finished Attempts"
                        value="Finished Attempts"
                    >
                        Finished Attempts
                    </option>
                </select>
            </div>
            {leaderboard === 'Seed' && (
                <PaginatedGameLeaderboard
                    name="Completed Games"
                    leaderboard={seedingTable.map((seed) => {
                        return {
                            username: seed.username,
                            stat: seed.gameCount,
                            placing: seed.seed,
                        };
                    })}
                />
            )}
            {tournaments.map((tournament) => {
                if (
                    leaderboard !== tournament.name
                    // !tournament.leaderboards?.pbLeaderboard
                )
                    return;

                return (
                    <PaginatedGameLeaderboard
                        key={tournament.shortName}
                        name={tournament.shortName}
                        leaderboard={tournament.leaderboards?.pbLeaderboard}
                        transform={(stat) => {
                            return (
                                <DurationToFormatted
                                    duration={stat.toString()}
                                />
                            );
                        }}
                    />
                );
            })}
            {leaderboard === 'Attempts' && (
                <PaginatedGameLeaderboard
                    name="Attempts"
                    leaderboard={metaLeaderboards.attemptsLeaderboard}
                />
            )}
            {leaderboard === 'Finished Attempts' && (
                <PaginatedGameLeaderboard
                    name="Finished Attempts"
                    leaderboard={metaLeaderboards.finishedAttemptsLeaderboard}
                />
            )}
            {leaderboard === 'Playtime' && (
                <PaginatedGameLeaderboard
                    name="Playtime"
                    leaderboard={metaLeaderboards.playTimeLeaderboard}
                    transform={(stat) => {
                        return (
                            <DurationToFormatted duration={stat.toString()} />
                        );
                    }}
                />
            )}
        </div>
    );
};

const generateLeaderboard = (
    data: Map<string, number>,
): { username: string; stat: number; placing: number }[] => {
    return Array.from(data.entries())
        .map(([username, stat]) => ({
            username,
            stat,
            placing: 0,
        }))
        .sort((a, b) => b.stat - a.stat)
        .map((count, i) => ({ ...count, placing: i + 1 }));
};

const updateLeaderboardMap = (
    map: Map<string, number>,
    leaderboard: { username: string; stat: string }[],
) => {
    leaderboard.forEach((item) => {
        if (!map.has(item.username)) {
            map.set(item.username, 0);
        }
        map.set(
            item.username,
            map.get(item.username)! + parseInt(item.stat, 10),
        );
    });
};

const generateMetaDataCombinedLeaderboards = (tournaments: Tournament[]) => {
    const playTime = new Map<string, number>();
    const attempts = new Map<string, number>();
    const finishedAttempts = new Map<string, number>();

    tournaments.forEach((tournament) => {
        updateLeaderboardMap(
            playTime,
            tournament.leaderboards?.totalRunTimeLeaderboard || [],
        );
        updateLeaderboardMap(
            attempts,
            tournament.leaderboards?.attemptCountLeaderboard || [],
        );
        updateLeaderboardMap(
            finishedAttempts,
            tournament.leaderboards?.finishedAttemptCountLeaderboard || [],
        );
    });

    return {
        playTimeLeaderboard: generateLeaderboard(playTime),
        attemptsLeaderboard: generateLeaderboard(attempts),
        finishedAttemptsLeaderboard: generateLeaderboard(finishedAttempts),
    };
};
