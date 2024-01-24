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
            <RaceHeader race={raceState} />
            <div className={"d-flex flex-column align-items-center h1"}>
                <RaceTimer race={raceState} />
            </div>
            <Row>
                <Col xl={4}>
                    <div className={"mb-3"}>
                        <RaceParticipantOverview race={raceState} />
                    </div>
                    <div>
                        <RaceActions race={raceState} user={user} />
                    </div>
                </Col>
                <Col xl={8}>
                    <RaceParticipantDetail race={raceState} />
                </Col>
            </Row>
        </div>
    );
};
