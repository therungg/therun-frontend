"use client";

import { Race, RaceParticipant } from "~app/races/races.types";
import { Button, Form, Table } from "react-bootstrap";
import Link from "next/link";
import { User } from "../../types/session.types";
import { useEffect, useState } from "react";
import { arrayToMap } from "~src/utils/array";
import {
    useAllRacesWebsocket,
    useUserRaceParticipationsWebsocket,
} from "~src/components/websocket/use-reconnect-websocket";
import Countdown from "react-countdown";
import { DurationToFormatted } from "~src/components/util/datetime";
import { Can, subject } from "~src/rbac/Can.component";
import { UserLink } from "~src/components/links/links";
import { createFictionalTestRace } from "~src/actions/races/create-fictional-test-race.action";
import { SubmitButton } from "~src/actions/components/submit-button";
import { LeaveRaceButton } from "~app/races/components/buttons/leave-race-button";
import { DeleteRaceButton } from "~app/races/components/buttons/delete-race-button";
import { JoinRaceButton } from "~app/races/components/buttons/join-race-button";

interface RaceOverviewProps {
    pendingRaces: Race[];
    inProgressRaces: Race[];
    user?: User;
    raceParticipations: RaceParticipant[];
}

//TODO: Very basic first page that just shows some functionality. Proof of concept only.
export const RaceOverview = ({
    pendingRaces,
    // inProgressRaces,
    user,
    raceParticipations,
}: RaceOverviewProps) => {
    const races = pendingRaces;
    const [stateRaces, setStateRaces] = useState(races);
    const [raceParticipationMap, setRaceParticipationMap] = useState(
        arrayToMap<RaceParticipant, "raceId">(raceParticipations, "raceId"),
    );

    const lastMessage = useAllRacesWebsocket();
    const userParticipationMessage = useUserRaceParticipationsWebsocket(user);

    useEffect(() => {
        if (
            lastMessage !== null &&
            lastMessage.data &&
            lastMessage.data.raceId
        ) {
            const newRaces = JSON.parse(JSON.stringify(stateRaces));

            const index = stateRaces.findIndex(
                (race) => race.raceId === lastMessage.data.raceId,
            );

            if (index !== -1) {
                newRaces[index] = lastMessage.data;
            } else {
                newRaces.unshift(lastMessage.data);
            }
            setStateRaces(newRaces);
        }
    }, [lastMessage]);

    useEffect(() => {
        if (
            userParticipationMessage !== null &&
            userParticipationMessage.data &&
            userParticipationMessage.data.raceId &&
            userParticipationMessage.data.user === user?.username
        ) {
            const newRaceParticipationMap = arrayToMap<
                RaceParticipant,
                "raceId"
            >(Array.from(raceParticipationMap.values()), "raceId");

            if (
                userParticipationMessage.data.status === "unjoined" &&
                newRaceParticipationMap.has(
                    userParticipationMessage.data.raceId,
                )
            ) {
                newRaceParticipationMap.delete(
                    userParticipationMessage.data.raceId,
                );
            } else {
                newRaceParticipationMap.set(
                    userParticipationMessage.data.raceId,
                    userParticipationMessage.data,
                );
            }

            setRaceParticipationMap(newRaceParticipationMap);
        }
    }, [userParticipationMessage]);

    return (
        <div>
            <h1>Races</h1>
            <Can I={"create"} a={"race"}>
                <a href={"/races/create"}>
                    <Button>Create race</Button>
                </a>
            </Can>
            <Can I={"moderate"} a={"race"}>
                <Form action={createFictionalTestRace}>
                    <SubmitButton
                        innerText={"Create Fictional Test Race"}
                        pendingText={"Creating Race..."}
                    />
                </Form>
            </Can>
            <Table responsive bordered striped>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Created By</th>
                        <th>Url</th>
                        <th>Ready/Joined</th>
                        <th>Top participants</th>
                        <th>Status</th>
                        <Can I={"join"} a={"race"}>
                            <th>Join/Leave</th>
                        </Can>
                        <Can I={"edit"} a={"race"}>
                            <th>Delete</th>
                        </Can>
                    </tr>
                </thead>
                <tbody>
                    {stateRaces.map((race) => {
                        const userIsInRace = raceParticipationMap.has(
                            race.raceId,
                        );

                        const userParticipation = userIsInRace
                            ? raceParticipationMap.get(race.raceId)
                            : undefined;

                        return (
                            <tr key={race.raceId}>
                                <td>{race.customName}</td>
                                <td>
                                    <UserLink username={race.creator} />
                                </td>
                                <td>
                                    <Link href={`/races/${race.raceId}`}>
                                        Link
                                    </Link>
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

                                <td>
                                    <div>{race.status}</div>
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
                                                        {
                                                            userParticipation?.status
                                                        }
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
                                    <Can
                                        I={"edit"}
                                        this={subject("race", race)}
                                    >
                                        <DeleteRaceButton
                                            raceId={race.raceId}
                                        />
                                    </Can>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
};
