import React from "react";
import { getPersonalBestRuns } from "~src/lib/get-personal-best-runs";
import { getTabulatedGameStatsPopular } from "~src/components/game/get-tabulated-game-stats";
import Homepage from "~app/homepage";

export const revalidate = 60;

export default async function Page() {
    const runsPromise = getPersonalBestRuns();
    const gamestatsPromise = getTabulatedGameStatsPopular();

    const [runs, gamestats] = await Promise.all([
        runsPromise,
        gamestatsPromise,
    ]);

    return <Homepage runs={runs} gamestats={gamestats} />;
}
