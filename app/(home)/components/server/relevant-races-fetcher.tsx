"use server";

import { getAllActiveRaces } from "~src/lib/races";
import RelevantRaces from "../client/relevant-races";
import {
    getInProgressRaces,
    getUpcomingRaces,
} from "~src/helpers/race-helpers";

export default async function RelevantRacesFetcher() {
    const races = await getAllActiveRaces();

    const inProgressRaces = getInProgressRaces(races);
    const upcomingRaces = getUpcomingRaces(races);

    return (
        <RelevantRaces
            inProgressRaces={inProgressRaces}
            upcomingRaces={upcomingRaces}
        />
    );
}
