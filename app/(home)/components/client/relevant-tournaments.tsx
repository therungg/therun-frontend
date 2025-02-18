"use client";

import { Tournament } from "~src/components/tournament/tournament-info";

export default function RelevantTournaments({
    tournaments,
}: {
    tournaments: Tournament[];
}) {
    return <div>{tournaments.length}</div>;
}
