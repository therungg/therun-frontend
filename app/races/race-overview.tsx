"use client";

import { Race, RaceParticipant } from "~app/races/races.types";
import { Button, Table } from "react-bootstrap";
import Link from "next/link";
import { joinRace, unjoinRace } from "~src/lib/races";
import { User } from "../../types/session.types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { arrayToMap } from "~src/utils/array";

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

    const raceParticipationMap = arrayToMap<RaceParticipant, "raceId">(
        raceParticipations,
        "raceId"
    );

    return (
        <div>
            <h1>Races</h1>
            {registeringForRace && <div>Registering for race...</div>}
            <Table responsive bordered striped>
                <thead>
                    <tr>
                        <th>name</th>
                        <th>url</th>
                        {user?.id && <th>join</th>}
                    </tr>
                </thead>
                <tbody>
                    {races.map((race) => {
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
