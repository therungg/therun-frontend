import { Race } from "~app/races/races.types";
import { TrophyIcon } from "~src/icons/trophy-icon";
import { DurationToFormatted } from "~src/components/util/datetime";
import React from "react";
import { sortRaceParticipants } from "~app/races/[race]/sort-race-participants";
import { FireIcon } from "~src/icons/fire-icon";
import { RaceParticipantPercentage } from "~app/races/components/race-participant-percentage";
import { UserLink } from "~src/components/links/links";

interface RacePlacingsProps {
    race: Race;
    amount?: number;
}

export const RacePlacings = ({ race, amount = 1 }: RacePlacingsProps) => {
    if (race.status === "finished")
        return <RacePlacingsFinishedRace race={race} amount={amount} />;

    if (race.status === "progress")
        return <RacePlacingsProgressRace race={race} amount={amount} />;

    return <></>;
};

const RacePlacingsFinishedRace = ({ race, amount = 1 }: RacePlacingsProps) => {
    // const results = race.results?.filter((result) => {
    //     return result.status === "confirmed";
    // }) as RaceResult[];

    // If we just need the first result and that person abandoned, we do not need to show it
    if (race.results && amount === 1 && race.results[0].status === "abandoned")
        return <></>;

    return (
        <>
            {race.results?.slice(0, amount).map((result, i) => {
                return (
                    <div key={result.name}>
                        {result.status === "confirmed" && i < 3 && (
                            <TrophyIcon
                                trophyColor={
                                    i === 0
                                        ? "gold"
                                        : i === 1
                                          ? "silver"
                                          : "bronze"
                                }
                            />
                        )}
                        {result.finalTime && (
                            <DurationToFormatted
                                duration={result.finalTime as number}
                            />
                        )}
                        {result.status === "abandoned" && <span>DNF</span>} -{" "}
                        <UserLink username={result.name} parentIsUrl={true} />
                    </div>
                );
            })}
        </>
    );
};

const RacePlacingsProgressRace = ({ race }: RacePlacingsProps) => {
    const firstPlace = sortRaceParticipants(race)[0];

    if (!firstPlace) return <></>;

    if (firstPlace.status === "finished" || firstPlace.status === "confirmed") {
        return (
            <>
                <TrophyIcon />
                <DurationToFormatted
                    duration={firstPlace.finalTime as number}
                />{" "}
                - <UserLink username={firstPlace.user} parentIsUrl={true} />
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
            <UserLink username={firstPlace.user} parentIsUrl={true} />
        </>
    );
};
