"use client";

import { Race } from "~app/races/races.types";
import { Button, Table } from "react-bootstrap";
import Link from "next/link";
import { joinRace } from "~src/lib/races";
import { User } from "../../types/session.types";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RaceOverviewProps {
    races: Race[];
    user?: User;
}

export const RaceOverview = ({ races, user }: RaceOverviewProps) => {
    const router = useRouter();
    const [registeringForRace, setRegisteringForRace] = useState(false);

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
                                        <Button
                                            onClick={async () => {
                                                setRegisteringForRace(true);
                                                const result = await joinRace(
                                                    race.raceId
                                                );
                                                setRegisteringForRace(false);
                                                if (result.raceId) {
                                                    const redirectUrl = `/races/${race.raceId}`;

                                                    router.push(redirectUrl);
                                                } else {
                                                    // eslint-disable-next-line no-console
                                                    console.error(result);
                                                }
                                            }}
                                        >
                                            Join race
                                        </Button>
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
