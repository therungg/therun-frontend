import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";
import { sortRaceParticipants } from "~app/races/[race]/sort-race-participants";
import { Spinner } from "react-bootstrap";
import { UserLink } from "~src/components/links/links";
import {
    DifferenceFromOne,
    DurationToFormatted,
} from "~src/components/util/datetime";
import { getPercentageDoneFromLiverun } from "~app/races/[race]/get-percentage-done-from-liverun";
import { useAutoAnimate } from "@formkit/auto-animate/react";
interface RaceParticipantOverviewProps {
    race: Race;
}

export const RaceParticipantOverview = ({
    race,
}: RaceParticipantOverviewProps) => {
    const participants = sortRaceParticipants(race);

    const [parent] = useAutoAnimate({
        duration: 300,
        easing: "ease-out",
    });

    return (
        <div className={"px-4 pt-2 pb-3 card game-border mh-100"} ref={parent}>
            <span className={"h4 flex-center mb-3"}>Standings</span>
            <hr />
            <table className={"w-100 text-end"}>
                <thead>
                    <tr>
                        <th className={"py-1 text-start"}></th>
                        <th className={"py-1"}></th>
                        <th className={"py-1"}>%</th>
                        <th className={"py-1"}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {participants?.map((participant, i) => {
                        return (
                            <RaceParticipantItem
                                placing={i + 1}
                                race={race}
                                key={participant.user}
                                participant={participant}
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export const RaceParticipantItem = ({
    participant,
    race,
    placing,
}: {
    participant: RaceParticipantWithLiveData;
    race: Race;
    placing: number;
}) => {
    const percentage = getPercentageDoneFromLiverun(participant);
    return (
        <>
            <tr className={"border-top"}>
                <td className={"py-1 text-start"}>{placing}.</td>
                <td className={"py-1 d-flex justify-self-end flex-grow-1"}>
                    <UserLink username={participant.user} />
                </td>
                <td className={"py-1"}>
                    {percentage > 0 && `${percentage.toFixed(0)}%`}
                </td>
                <td className={"py-1 text-nowrap"}>
                    <RaceParticipantStatus
                        race={race}
                        participant={participant}
                    />
                </td>
            </tr>
        </>
    );
};

const RaceParticipantStatus = ({
    participant,
    race,
}: {
    participant: RaceParticipantWithLiveData;
    race: Race;
}) => {
    const abandonedTime =
        new Date(participant.abandondedAtDate as string).getTime() -
        new Date(race.startTime as string).getTime();
    return (
        <div>
            {(participant.status === "finished" ||
                participant.status === "confirmed") && (
                <span className={"fst-italic"}>
                    <DurationToFormatted
                        duration={participant.finalTime?.toString() as string}
                    />
                </span>
            )}
            {participant.status === "started" && (
                <div className={"d-flex"}>
                    {/*<RaceParticipantTimer raceParticipant={participant} />*/}
                    {/*{"   ("}*/}
                    <DifferenceFromOne
                        diff={participant.liveData?.delta as number}
                        className={""}
                    />
                    {/*{")"}*/}
                </div>
            )}
            {participant.status === "abandoned" && (
                <span>
                    DNF <DurationToFormatted duration={abandonedTime} />
                </span>
            )}
            {participant.status === "ready" && (
                <Spinner animation={"grow"} size={"sm"} />
            )}
        </div>
    );
};
