"use client";

import { Race } from "~app/races/races.types";

interface RelevantRacesProps {
    inProgressRaces: Race[];
    upcomingRaces: Race[];
}

export default function RelevantRaces({
    inProgressRaces,
    upcomingRaces,
}: RelevantRacesProps) {
    return (
        <div>
            {inProgressRaces.length}
            {upcomingRaces.length}
        </div>
    );
}
