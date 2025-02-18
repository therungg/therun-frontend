"use server";

import RelevantTournaments from "../client/relevant-tournaments";
import { getTournaments } from "~src/components/tournament/getTournaments";

export default async function TournamentsFetcher() {
    const tournaments = await getTournaments();

    return <RelevantTournaments tournaments={tournaments} />;
}
