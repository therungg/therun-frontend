import { getPersonalBestRuns } from "../../lib/get-personal-best-runs";
import { getTabulatedGameStatsPopular } from "../../components/game/get-tabulated-game-stats";

export const handler = async (req, res) => {
    if (req.method !== "GET" || !req.query.q) res.status(500);

    const runsPromise = getPersonalBestRuns();
    const gamestatsPromise = getTabulatedGameStatsPopular();

    const [runs, gamestats] = await Promise.all([
        runsPromise,
        gamestatsPromise,
    ]);

    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=1500");

    res.status(200).json({ runs, gamestats });
};

export default handler;
