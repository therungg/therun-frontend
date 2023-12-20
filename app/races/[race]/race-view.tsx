"use client";

import { Race, RaceParticipant } from "~app/races/races.types";
import { arrayToMap } from "~src/utils/array";
import { User } from "../../../types/session.types";
import { Button, Table } from "react-bootstrap";
import { readyRace, unreadyRace } from "~src/lib/races";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRaceWebsocket } from "~src/components/websocket/use-reconnect-websocket";

interface RaceDetailProps {
    race: Race;
    user?: User;
}

export const RaceDetail = ({ race, user }: RaceDetailProps) => {
    const router = useRouter();
    const [readyLoading, setReadyLoading] = useState(false);
    const [raceParticipantsMap, setRaceParticipantsMap] = useState<
        Map<string, RaceParticipant>
    >(arrayToMap(race.participants || [], "user"));

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

    const lastMessage = useRaceWebsocket(race.raceId);

    useEffect(() => {
        if (
            lastMessage !== null &&
            lastMessage.data &&
            lastMessage.data.raceId
        ) {
            // eslint-disable-next-line no-console
            console.log("New race event", lastMessage.data, lastMessage.type);

            if (lastMessage.type === "participantUpdate") {
                // Create a new Map for the updated state
                const updatedMap = new Map(raceParticipantsMap);

                updatedMap.set(
                    (lastMessage.data as RaceParticipant).user,
                    lastMessage.data as RaceParticipant,
                );

                setRaceParticipantsMap(updatedMap);
            }
        }
    }, [lastMessage]);

    return (
        <div>
            {JSON.stringify(Array.from(raceParticipantsMap))}
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
