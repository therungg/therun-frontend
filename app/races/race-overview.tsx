"use client";

import { Race, RaceParticipant } from "~app/races/races.types";
import { Button, Table } from "react-bootstrap";
import Link from "next/link";
import { joinRace, unjoinRace } from "~src/lib/races";
import { User } from "../../types/session.types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { arrayToMap } from "~src/utils/array";
import {
    useAllRacesWebsocket,
    useUserRaceParticipationsWebsocket,
} from "~src/components/websocket/use-reconnect-websocket";
import Countdown from "react-countdown";
import { DurationToFormatted } from "~src/components/util/datetime";

interface RaceOverviewProps {
    races: Race[];
    user?: User;
    raceParticipations: RaceParticipant[];
}

//TODO: Very basic first page that just shows some functionality. Proof of concept only.
export const RaceOverview = ({
    races,
    user,
    raceParticipations,
}: RaceOverviewProps) => {
    const router = useRouter();
    const [registeringForRace, setRegisteringForRace] = useState(false);
    const [stateRaces, setStateRaces] = useState(races);
    const [raceParticipationMap, setRaceParticipationMap] = useState(
        arrayToMap<RaceParticipant, "raceId">(raceParticipations, "raceId")
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
                (race) => race.raceId === lastMessage.data.raceId
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
                    userParticipationMessage.data.raceId
                )
            ) {
                newRaceParticipationMap.delete(
                    userParticipationMessage.data.raceId
                );
            } else {
                newRaceParticipationMap.set(
                    userParticipationMessage.data.raceId,
                    userParticipationMessage.data
                );
            }

            setRaceParticipationMap(newRaceParticipationMap);
        }
    }, [userParticipationMessage]);

    return (
        <div>
            <h1>Races</h1>
            {user?.id && (
                <a href={"/races/create"}>
                    <Button>Create race</Button>
                </a>
            )}

            {registeringForRace && <div>Registering for race...</div>}
            <Table responsive bordered striped>
                <thead>
                    <tr>
                        <th>name</th>
                        <th>url</th>
                        <th>ready/joined</th>
                        <th>Top participants</th>
                        <th>status</th>
                        {user?.id && <th>join/leave</th>}
                    </tr>
                </thead>
                <tbody>
                    {stateRaces.map((race) => {
                        const userIsInRace = raceParticipationMap.has(
                            race.raceId
                        );

                        const userParticipation = userIsInRace
                            ? raceParticipationMap.get(race.raceId)
                            : undefined;

                        return (
                            <tr key={race.raceId}>
                                <td>{race.customName}</td>
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
                                {user?.id && (
                                    <td>
                                        {userIsInRace && (
                                            <div>
                                                <Button
                                                    onClick={async () => {
                                                        // TODO: This should not be inline (seperate component) and obviously should not refresh the page but update the state
                                                        setRegisteringForRace(
                                                            true
                                                        );
                                                        const result =
                                                            await unjoinRace(
                                                                race.raceId
                                                            );
                                                        setRegisteringForRace(
                                                            false
                                                        );
                                                        if (result.raceId) {
                                                            router.refresh();
                                                        } else {
                                                            // eslint-disable-next-line no-console
                                                            console.error(
                                                                result
                                                            );
                                                        }
                                                    }}
                                                >
                                                    Leave Race
                                                </Button>
                                                <div>
                                                    Status:{" "}
                                                    {userParticipation?.status}
                                                </div>
                                            </div>
                                        )}
                                        {!userIsInRace && (
                                            <Button
                                                onClick={async () => {
                                                    // TODO: This should not be inline (seperate component)
                                                    setRegisteringForRace(true);
                                                    const result =
                                                        await joinRace(
                                                            race.raceId
                                                        );
                                                    setRegisteringForRace(
                                                        false
                                                    );
                                                    if (result.raceId) {
                                                        const redirectUrl = `/races/${race.raceId}`;

                                                        router.push(
                                                            redirectUrl
                                                        );
                                                    } else {
                                                        // eslint-disable-next-line no-console
                                                        console.error(result);
                                                    }
                                                }}
                                            >
                                                Join race
                                            </Button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
};
