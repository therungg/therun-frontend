import { Race, RaceResult } from "~app/races/races.types";
import { TrophyIcon } from "~src/icons/trophy-icon";
import { DurationToFormatted } from "~src/components/util/datetime";
import React from "react";
import { sortRaceParticipants } from "~app/races/[race]/sort-race-participants";
import { FireIcon } from "~src/icons/fire-icon";
import { RaceParticipantPercentage } from "~app/races/components/race-participant-percentage";

export const RaceFirstPlace = ({ race }: { race: Race }) => {
    if (race.status === "finished")
        return <RaceFirstPlaceFinishedRace race={race} />;

    if (race.status === "progress")
        return <RaceFirstPlaceProgressRace race={race} />;

    return <></>;
};

const RaceFirstPlaceFinishedRace = ({ race }: { race: Race }) => {
    const results = race.results as RaceResult[];
    const firstPlace =
        results && results[0].status === "confirmed" ? results[0] : null;
    return (
        <>
            {firstPlace && (
                <>
                    <TrophyIcon />
                    <DurationToFormatted
                        duration={firstPlace.finalTime as number}
                    />{" "}
                    - {firstPlace.name}
                </>
            )}
        </>
    );
};

const RaceFirstPlaceProgressRace = ({ race }: { race: Race }) => {
    const firstPlace = sortRaceParticipants(race)[0];

    if (firstPlace.status === "finished" || firstPlace.status === "confirmed") {
        return (
            <>
                <TrophyIcon />
                <DurationToFormatted
                    duration={firstPlace.finalTime as number}
                />{" "}
                - {firstPlace.user}
            </>
        );
    }

    if (!firstPlace.liveData) return <></>;

    const percentage =
        firstPlace.liveData.runPercentageTime ||
        firstPlace.liveData.runPercentageSplits;

    if (!percentage || percentage > 1) return <></>;

    return (
        <>
            <FireIcon />
            <RaceParticipantPercentage participant={firstPlace} /> -{" "}
            {firstPlace.user}
        </>
    );
};
