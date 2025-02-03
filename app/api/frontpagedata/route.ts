import { getPersonalBestRuns } from "~src/lib/server/get-personal-best-runs";
import { getTabulatedGameStatsPopular } from "~src/components/game/get-tabulated-game-stats";
import { apiResponse } from "~app/api/response";

export const revalidate = 10;

export async function GET() {
    const runsPromise = getPersonalBestRuns();
    const gamestatsPromise = getTabulatedGameStatsPopular();

    const [runs, gamestats] = await Promise.all([
        runsPromise,
        gamestatsPromise,
    ]);

    return apiResponse({
        body: { runs, gamestats },
        cache: {
            maxAge: revalidate,
            swr: 1500,
        },
    });
}
