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
        <Row className={"gap-4"}>
            <Col className={"d-flex flex-column h1"}>
                <RaceTimer race={raceState} />
            </Col>
            <Col
                md={12}
                lg={5}
                className="d-flex justify-content-end align-items-center gap-2 flex-wrap"
            >
                <RaceActions race={raceState} user={user} />
            </Col>
            <Col xs={12}>
                <RaceHeader race={raceState} />
            </Col>
            <Col>
                <Row>
                    <Col xl={4} className={"order-xl-last mb-4 mb-xl-0"}>
                        <div className={"sticky-top"} style={{ top: "1rem" }}>
                            <RaceParticipantOverview race={raceState} />
                        </div>
                    </Col>
                    <Col xl={8}>
                        <RaceParticipantDetail race={raceState} />
                    </Col>
                </Row>
            </Col>
        </Row>
    );
};
