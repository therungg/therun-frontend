import { Metadata } from "next";
import { getBaseUrl } from "~src/actions/base-url.action";
import { getTabulatedGameStatsPopular } from "~src/components/game/get-tabulated-game-stats";
import { AllGames } from "./all-games";

export const metadata: Metadata = {
    title: "Game overview",
    description: "All games overview",
};

export default async function AllGamesPage() {
    const allGames =
        (await getAllGames()) ?? (await getTabulatedGameStatsPopular());
    return <AllGames games={allGames} />;
}
async function getAllGames() {
    const baseUrl = getBaseUrl();
    const result = await fetch(`${baseUrl}/api/games`);
    return result.json();
}
