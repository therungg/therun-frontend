"use client";

import { Race } from "~app/races/races.types";
import { arrayToMap } from "~src/utils/array";
import { User } from "../../../types/session.types";
import { Button, Table } from "react-bootstrap";
import { readyRace, unreadyRace } from "~src/lib/races";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface RaceDetailProps {
    race: Race;
    user?: User;
}

export const RaceDetail = ({ race, user }: RaceDetailProps) => {
    const router = useRouter();
    const [readyLoading, setReadyLoading] = useState(false);

    const raceParticipantsMap = arrayToMap(race.participants || [], "user");
    const raceIsPending = race.status === "pending";
    const userParticipates = user && raceParticipantsMap.has(user.username);

    const userIsReady =
        userParticipates &&
        raceParticipantsMap.get(user?.username)?.status === "ready";

    const onReadyClick = async (ready: boolean) => {
        // TODO: This should not be inline (seperate component) and obviously should not refresh the page but update the state
        setReadyLoading(true);
        const result = ready
            ? await readyRace(race.raceId)
            : await unreadyRace(race.raceId);
        setReadyLoading(false);
        if (result.raceId) {
            router.refresh();
        } else {
            // eslint-disable-next-line no-console
            console.error(result);
        }
    };

    return (
        <div>
            {readyLoading && <div>Setting ready/unready</div>}
            {raceIsPending && userParticipates && (
                <div>
                    {!userIsReady && (
                        <Button onClick={() => onReadyClick(true)}>
                            Ready up
                        </Button>
                    )}
                    {userIsReady && (
                        <Button onClick={() => onReadyClick(false)}>
                            Unready
                        </Button>
                    )}
                </div>
            )}
            <Table>
                <thead>
                    <tr>
                        <th>Name</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </Table>
        </div>
    );
};
