import { getPersonalBestRuns } from "../../lib/get-personal-best-runs";
import { getTabulatedGameStatsPopular } from "../../components/game/get-tabulated-game-stats";
import { NextResponse } from "next/server";

export const handler = async (req, res) => {
    if (req.method !== "GET" || !req.query.q) {
        return NextResponse.json(
            {
                error: "Must be GET request and supply `q` parameter",
            },
            { status: 400 }
        );
    }

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
