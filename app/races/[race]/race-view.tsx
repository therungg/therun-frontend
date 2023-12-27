"use client";

import {
    Race,
    RaceParticipant,
    RaceParticipantWithLiveData,
} from "~app/races/races.types";
import { arrayToMap } from "~src/utils/array";
import { User } from "../../../types/session.types";
import { Button, Col, Row } from "react-bootstrap";
import { readyRace, unreadyRace } from "~src/lib/races";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRaceWebsocket } from "~src/components/websocket/use-reconnect-websocket";
import { RaceParticipantOverview } from "~app/races/[race]/race-participant-overview";
import { FromNow } from "~src/components/util/datetime";
import { RaceParticipantDetail } from "~app/races/[race]/race-participant-detail";

interface RaceDetailProps {
    race: Race;
    user?: User;
}

export type RaceParticipantsMap = Map<string, RaceParticipant>;

export const RaceDetail = ({ race, user }: RaceDetailProps) => {
    const [raceState, setRaceState] = useState(race);

    const router = useRouter();
    const [readyLoading, setReadyLoading] = useState(false);
    const [raceParticipantsMap, setRaceParticipantsMap] =
        useState<RaceParticipantsMap>(
            arrayToMap(raceState.participants || [], "user"),
        );

    const raceIsPending = raceState.status === "pending";
    const userParticipates = user && raceParticipantsMap.has(user.username);

    const userIsReady =
        userParticipates &&
        raceParticipantsMap.get(user?.username)?.status === "ready";

    const onReadyClick = async (ready: boolean) => {
        // TODO: This should not be inline (seperate component) and obviously should not refresh the page but update the state
        setReadyLoading(true);
        const result = ready
            ? await readyRace(raceState.raceId)
            : await unreadyRace(raceState.raceId);
        setReadyLoading(false);
        if (result.raceId) {
            router.refresh();
        } else {
            // eslint-disable-next-line no-console
            console.error(result);
        }
    };

    const lastMessage = useRaceWebsocket(raceState.raceId);

    useEffect(() => {
        if (
            lastMessage !== null &&
            lastMessage.data &&
            lastMessage.data.raceId
        ) {
            if (lastMessage.type === "participantUpdate") {
                // Create a new Map for the updated state
                const updatedMap = new Map(raceParticipantsMap);

                updatedMap.set(
                    (lastMessage.data as RaceParticipant).user,
                    lastMessage.data as RaceParticipant,
                );

                setRaceParticipantsMap(updatedMap);

                const index = raceState.participants?.findIndex(
                    (participant) =>
                        participant.user ===
                        (lastMessage.data as RaceParticipant).user,
                );

                const newRace = { ...raceState };

                if (index !== undefined && index > -1) {
                    (newRace.participants as RaceParticipantWithLiveData[])[
                        index
                    ] = lastMessage.data as RaceParticipant;
                } else {
                    newRace.participants?.push(
                        lastMessage.data as RaceParticipant,
                    );
                }

                setRaceState(newRace);
            }
            if (lastMessage.type === "raceUpdate") {
                const newRace = {
                    ...raceState,
                    ...lastMessage.data,
                };
                setRaceState(newRace as Race);
            }
        }
    }, [lastMessage]);

    return (
        <div>
            <div
                className={
                    "d-flex flex-column justify-content-center align-items-center mb-4"
                }
            >
                <h1>{raceState.customName}</h1>
                <h3>Status: {raceState.status}</h3>
                <h3>
                    Started{" "}
                    {raceState.startTime ? (
                        <FromNow time={raceState.startTime} />
                    ) : (
                        <>Race pending</>
                    )}
                </h3>
                <h3>
                    {raceState.game} - {raceState.category}
                </h3>
            </div>
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
            <Row>
                <Col xl={4}>
                    <RaceParticipantOverview race={raceState} />
                </Col>
                <Col xl={8}>
                    <RaceParticipantDetail race={raceState} />
                </Col>
            </Row>
        </div>
    );
};
