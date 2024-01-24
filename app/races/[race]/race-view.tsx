"use client";

import { Race } from "~app/races/races.types";
import { User } from "../../../types/session.types";
import { Col, Row } from "react-bootstrap";
import React from "react";
import { RaceParticipantOverview } from "~app/races/[race]/race-participant-overview";
import { RaceParticipantDetail } from "~app/races/[race]/race-participant-detail";
import { RaceActions } from "~app/races/[race]/race-actions";
import { RaceHeader } from "~app/races/[race]/race-header";
import { RaceTimer } from "~app/races/[race]/race-timer";
import { useRace } from "~app/races/hooks/use-race";

interface RaceDetailProps {
    race: Race;
    user?: User;
}

export const RaceDetail = ({ race, user }: RaceDetailProps) => {
    const raceState = useRace(race);

    return (
        <div>
            <div className={"d-flex flex-column align-items-center h1"}>
                <RaceTimer race={raceState} />
            </div>
            <RaceHeader race={raceState} />
            <Row>
                <Col xl={4} xxl={3} className={"order-xl-last"}>
                    <div
                        className={"mb-3 mb-xl-0 sticky-top"}
                        style={{ top: "1rem" }}
                    >
                        <RaceParticipantOverview race={raceState} />
                    </div>
                    <div>
                        <RaceActions race={raceState} user={user} />
                    </div>
                </Col>
                <Col xl={8} xxl={9}>
                    <RaceParticipantDetail race={raceState} />
                </Col>
            </Row>
        </div>
    );
};
