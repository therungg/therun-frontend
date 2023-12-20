import { Tournament } from "~src/components/tournament/tournament-info";
import { Count } from "~app/games/[game]/game.types";

export interface CombinedLeaderboardStat {
    runs: Map<string, CombinedLeaderboardRun>;
    seed: number;
    gameCount: number;
    seedPercentage: number;
    username: string;
}

export interface CombinedLeaderboardRun extends Count {
    placing: number;
    differenceToFirst: number;
}

export const getCombinedTournamentLeaderboardComponent = (
    tournaments: Tournament[],
): CombinedLeaderboardStat[] => {
    const userGameMap: Map<
        string,
        Map<string, CombinedLeaderboardRun>
    > = new Map();

    tournaments.forEach((tournament) => {
        const leaderboard = tournament.leaderboards?.pbLeaderboard;

        const game = tournament.game as string;

        leaderboard?.forEach((board, placing, allPlacings) => {
            if (!userGameMap.has(board.username)) {
                userGameMap.set(board.username, new Map());
            }

            const numberOne = allPlacings[0];
            const differenceToFirst =
                (parseInt(board.stat as string) /
                    parseInt(numberOne.stat as string)) *
                    100 -
                100;

            userGameMap.get(board.username)?.set(game, {
                ...board,
                placing: placing + 1,
                differenceToFirst,
            });
        });
    });

    const finalUserGameMap: Map<string, CombinedLeaderboardStat> = new Map();

    Array.from(userGameMap.entries()).forEach(([username, runs]) => {
        const count = runs.size;
        const runDifferences = Array.from(runs.values()).map(
            (run) => run.differenceToFirst,
        );

        const sum = runDifferences.reduce((a, c) => a + c, 0);
        const penalty = 1 + (tournaments.length - count) / 10;
        const seedPercentage = (sum / runDifferences.length) * penalty;

        const stat: CombinedLeaderboardStat = {
            gameCount: count,
            seed: -1,
            seedPercentage,
            runs,
            username,
        };

        finalUserGameMap.set(username, stat);
    });

    return Array.from(finalUserGameMap.values())
        .sort((a, b) => {
            if (a.gameCount === b.gameCount) {
                return a.seedPercentage - b.seedPercentage;
            }

            if (a.gameCount >= 4 && b.gameCount < 4) return -1;
            if (a.gameCount < 4 && b.gameCount >= 4) return 1;

            if (a.gameCount >= 4 && b.gameCount >= 4) {
                return a.seedPercentage - b.seedPercentage;
            }

            if (a.gameCount < 4 && b.gameCount < 4) {
                return b.gameCount - a.gameCount;
            }
        })
        .map((stat, seed) => {
            return {
                ...stat,
                seed: seed + 1,
            };
        });
};
