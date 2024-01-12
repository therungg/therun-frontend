import { Table } from "react-bootstrap";
import { Can, subject } from "~src/rbac/Can.component";
import Link from "next/link";
import { UserLink } from "~src/components/links/links";
import { DurationToFormatted } from "~src/components/util/datetime";
import Countdown from "react-countdown";
import { LeaveRaceButton } from "~app/races/components/buttons/leave-race-button";
import { JoinRaceButton } from "~app/races/components/buttons/join-race-button";
import { DeleteRaceButton } from "~app/races/components/buttons/delete-race-button";
import { Race, RaceParticipant } from "~app/races/races.types";

export const PendingRaces = ({
    races,
    raceParticipationMap,
}: {
    races: Race[];
    raceParticipationMap: Map<string, RaceParticipant>;
}) => {
    return (
        <Table responsive bordered striped>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Created By</th>
                    <th>Ready/Joined</th>
                    <th>Top participants</th>
                    <Can I={"join"} a={"race"}>
                        <th>Join/Leave</th>
                    </Can>
                    <Can I={"edit"} a={"race"}>
                        <th>Delete</th>
                    </Can>
                </tr>
            </thead>
            <tbody>
                {races.map((race) => {
                    const userIsInRace = raceParticipationMap.has(race.raceId);

                    const userParticipation = userIsInRace
                        ? raceParticipationMap.get(race.raceId)
                        : undefined;

                    return (
                        <tr key={race.raceId}>
                            <td>
                                <Link href={`/races/${race.raceId}`}>
                                    {race.customName}
                                </Link>
                                {race.startTime &&
                                    race.status === "starting" && (
                                        <div>
                                            Starts in{" "}
                                            <Countdown
                                                date={race.startTime}
                                                renderer={({
                                                    seconds,
                                                    completed,
                                                }) => {
                                                    if (completed) {
                                                        // Render a completed state
                                                        return <span />;
                                                    } else {
                                                        // Render a countdown
                                                        return (
                                                            <span>
                                                                {seconds}
                                                            </span>
                                                        );
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                            </td>
                            <td>
                                <UserLink username={race.creator} />
                            </td>

                            <td>
                                {race.readyParticipantCount}/
                                {race.participantCount}
                            </td>
                            <td>
                                {race.topParticipants
                                    .slice(0, 3)
                                    .map((participant) => {
                                        return (
                                            <div
                                                key={
                                                    race.raceId +
                                                    participant.user
                                                }
                                            >
                                                {participant.user}{" "}
                                                {participant.pb && (
                                                    <DurationToFormatted
                                                        duration={
                                                            participant.pb
                                                        }
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                            </td>
                            <Can I={"join"} a={"race"}>
                                <td>
                                    {userIsInRace &&
                                        race.status === "pending" && (
                                            <div>
                                                <LeaveRaceButton
                                                    raceId={race.raceId}
                                                />
                                                <div>
                                                    Status:{" "}
                                                    {userParticipation?.status}
                                                </div>
                                            </div>
                                        )}
                                    {!userIsInRace &&
                                        race.status === "pending" && (
                                            <JoinRaceButton
                                                raceId={race.raceId}
                                            />
                                        )}
                                </td>
                            </Can>

                            <td>
                                <Can I={"edit"} this={subject("race", race)}>
                                    <DeleteRaceButton raceId={race.raceId} />
                                </Can>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </Table>
    );
};
