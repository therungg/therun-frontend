import { apiResponse } from '~app/(old-layout)/api/response';
import { getTabulatedGameStatsPopular } from '~src/components/game/get-tabulated-game-stats';
import { getPersonalBestRuns } from '~src/lib/get-personal-best-runs';

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
            maxAge: 60,
            swr: 1500,
        },
    });
}
