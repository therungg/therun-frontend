import { LiveRun } from "~app/live/live.types";

export const liveRunArrayToMap = (
    liveData: LiveRun[],
    sort = "pb",
    leaderboards = null,
    leaderboardsRta = null
) => {
    liveData.sort((a, b) => {
        if (sort === "time") {
            if (a.currentSplitIndex < 0) return 1;
            if (b.currentSplitIndex < 0) return -1;

            const aTime = a.startedAt;
            const bTime = b.startedAt;

            if (!bTime) return 1;
            if (!aTime) return -1;

            if (aTime > bTime) return 1;
            return -1;
        }
        if (sort === "name") {
            if (a.user.toLowerCase() < b.user.toLowerCase()) return -1;
            if (a.user.toLowerCase() == b.user.toLowerCase()) return 0;
            return 1;
        }
        if (sort === "prediction") {
            if (
                !b.currentPrediction ||
                !b.currentTime ||
                parseInt(b.currentPrediction) < 1000 ||
                b.gameData?.finishedAttemptCount < 10
            ) {
                return -1;
            }
            if (
                !a.currentPrediction ||
                !a.currentTime ||
                parseInt(a.currentPrediction) < 1000 ||
                a.gameData?.finishedAttemptCount < 10
            ) {
                return 1;
            }
            if (parseInt(a.currentPrediction) < parseInt(b.currentPrediction))
                return -1;
            return 1;
        }
        if (sort === "personalBest") {
            if (!a.pb) return 1;
            if (!b.pb) return -1;
            if (a.pb < b.pb) return -1;
            if (a.pb == b.pb) return 0;
            return 1;
        }
        if (sort === "tournamentPb" || sort === "pb") {
            if (!leaderboards || !leaderboards.pbLeaderboard) {
                if (a.pb < b.pb) return -1;
                if (a.pb == b.pb) return 0;
                return 1;
            }

            const aUser = a.user;
            const bUser = b.user;

            const aLeaderboardRanking = leaderboards.pbLeaderboard.findIndex(
                (count) => {
                    return count.username == aUser;
                }
            );
            const bLeaderboardRanking = leaderboards.pbLeaderboard.findIndex(
                (count) => {
                    return count.username == bUser;
                }
            );

            if (aLeaderboardRanking < 0 && bLeaderboardRanking < 0) {
                if (!leaderboardsRta || !leaderboardsRta.pbLeaderboard)
                    return 1;

                const newALeaderboardRanking =
                    leaderboardsRta.pbLeaderboard.findIndex((count) => {
                        return count.username == aUser;
                    });
                const newBLeaderboardRanking =
                    leaderboardsRta.pbLeaderboard.findIndex((count) => {
                        return count.username == bUser;
                    });

                if (newBLeaderboardRanking < 0) return -1;
                if (newALeaderboardRanking < 0) return 1;

                if (newALeaderboardRanking < newBLeaderboardRanking) return -1;
                return 1;
            }

            if (bLeaderboardRanking < 0) return -1;
            if (aLeaderboardRanking < 0) return 1;

            if (aLeaderboardRanking < bLeaderboardRanking) return -1;
            return 1;
        }
    });

    const map = {};

    liveData.forEach((l) => {
        const user = l.user.toString();

        map[user] = l;
    });

    return map;
};
