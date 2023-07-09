import { Metadata } from "next";
import { AllGames } from "./all-games";
import { getGamesPage } from "~src/components/game/get-tabulated-game-stats";

export const metadata: Metadata = {
    title: "Game overview",
    description: "All games overview",
};

export default async function AllGamesPage() {
    const allGames = await getGamesPage();

    return <AllGames gamePagination={allGames} />;
}
