"use client";

import {
    Race,
    RaceParticipant,
    RaceParticipantWithLiveData,
} from "~app/races/races.types";
import { arrayToMap } from "~src/utils/array";
import { User } from "../../../types/session.types";
import { Col, Row } from "react-bootstrap";
import React, { useEffect, useState } from "react";
import { useRaceWebsocket } from "~src/components/websocket/use-reconnect-websocket";
import { RaceParticipantOverview } from "~app/races/[race]/race-participant-overview";
import { RaceParticipantDetail } from "~app/races/[race]/race-participant-detail";
import { RaceActions } from "~app/races/[race]/race-actions";
import { RaceHeader } from "~app/races/[race]/race-header";
import { RaceTimer } from "~app/races/[race]/race-timer";

interface RaceDetailProps {
    race: Race;
    user?: User;
}

export type RaceParticipantsMap = Map<string, RaceParticipant>;

export const RaceDetail = ({ race, user }: RaceDetailProps) => {
    const [raceState, setRaceState] = useState(race);

    const [raceParticipantsMap, setRaceParticipantsMap] =
        useState<RaceParticipantsMap>(
            arrayToMap(raceState.participants || [], "user"),
        );

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

                // Needs to be overridden because this is not accurate from the general race websocket
                newRace.participants = raceState.participants;
                setRaceState(newRace as Race);
            }
        }
    }, [lastMessage]);

    return (
        <div>
            <RaceHeader race={raceState} />
            <div className={"d-flex flex-column align-items-center h1"}>
                <RaceTimer race={raceState} />
            </div>
            <RaceActions
                race={raceState}
                user={user}
                raceParticipantsMap={raceParticipantsMap}
            />
            <div
                className={
                    "d-flex flex-column justify-content-center align-items-center mb-4"
                }
            >
                <Row>
                    <Col xl={4}>
                        <RaceParticipantOverview race={raceState} />
                    </Col>
                    <Col xl={8}>
                        <RaceParticipantDetail race={raceState} />
                    </Col>
                </Row>
            </div>
        </div>
    );
};
