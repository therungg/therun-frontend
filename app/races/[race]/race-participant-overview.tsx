import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";
import { sortRaceParticipants } from "~app/races/[race]/sort-race-participants";
import { UserLink } from "~src/components/links/links";
import { DurationToFormatted } from "~src/components/util/datetime";
import { getPercentageDoneFromLiverun } from "~app/races/[race]/get-percentage-done-from-liverun";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { TrophyIcon } from "~src/icons/trophy-icon";
import { RaceParticipantTimer } from "~app/races/[race]/race-timer";
import { RaceParticipantRatingDisplay } from "~app/races/components/race-participant-rating-display";

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

    const firstAbandonedPlacing = participants.findIndex(
        (participant) => participant.status === "abandoned",
    );

    return (
        <div className={"px-4 pt-2 pb-3 mb-3 card game-border mh-100"}>
            <span className={"h4 flex-center mb-0"}>Standings</span>
            <hr />
            <table className={"w-100 text-end"}>
                <thead>
                    <tr>
                        <th className={"py-1 text-start"}>#</th>
                        <th
                            className={
                                "py-1 d-flex justify-self-end flex-grow-1"
                            }
                        >
                            Username
                        </th>
                        <th className={"py-1"}>Rating</th>
                        <th className={"py-1"}>%</th>
                        <th className={"py-1"}>Status</th>
                    </tr>
                </thead>
                <tbody ref={parent}>
                    {participants?.map((participant, i) => {
                        const placing =
                            participant.status === "abandoned"
                                ? firstAbandonedPlacing + 1
                                : i + 1;
                        return (
                            <RaceParticipantItem
                                placing={placing}
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
            <tr>
                <td className={"text-start"}>
                    {participant.status !== "abandoned" && `${placing}.`}
                    {participant.status == "abandoned" && `-`}
                </td>
                <td className={"d-flex justify-self-end flex-grow-1"}>
                    <UserLink
                        username={participant.user}
                        url={`/${participant.user}/races`}
                    />
                    {placing === 1 && participant.status === "confirmed" && (
                        <span className={"ms-1"}>
                            <TrophyIcon />
                        </span>
                    )}
                </td>
                <td>
                    <RaceParticipantRatingDisplay
                        raceParticipant={participant}
                    />
                </td>
                <td>
                    {percentage > 0 && `${percentage.toFixed(0)}%`}
                    {percentage === 0 && "-"}
                </td>
                <td className={"text-nowrap"}>
                    <RaceParticipantStatus
                        race={race}
                        participant={participant}
                    />
                </td>
            </tr>
            {/*{percentage > 0 && (*/}
            {/*    <tr className={"h-50"}>*/}
            {/*        <td colSpan={10}>*/}
            {/*            <RaceParticipantPercentageLine*/}
            {/*                participant={participant}*/}
            {/*            />*/}
            {/*        </td>*/}
            {/*    </tr>*/}
            {/*)}*/}
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
    // eslint-disable-next-line no-unused-vars
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
                        padded
                    />
                </span>
            )}
            {participant.status === "started" && (
                <div suppressHydrationWarning={true}>
                    <RaceParticipantTimer
                        raceParticipant={participant}
                        race={race}
                    />
                </div>
            )}
            {participant.status === "abandoned" && (
                <span>
                    DNF
                    {/*<DurationToFormatted duration={abandonedTime} />*/}
                </span>
            )}
            {participant.status === "ready" && (
                <span>
                    {race.status === "progress" && <span>In Progress</span>}
                    {race.status === "pending" && <span>Ready</span>}
                </span>
            )}
        </div>
    );
};
