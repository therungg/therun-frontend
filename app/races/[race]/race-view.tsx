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
import {
    Breadcrumb,
    BreadcrumbItem,
} from "~src/components/breadcrumbs/breadcrumb";

interface RaceDetailProps {
    race: Race;
    user?: User;
}

export const RaceDetail = ({ race, user }: RaceDetailProps) => {
    const raceState = useRace(race);

    const breadcrumbs: BreadcrumbItem[] = [
        { content: "Races", href: "/races" },
        { content: race.raceId },
    ];
    return (
        <>
            <Breadcrumb breadcrumbs={breadcrumbs} />
            <Row>
                <Col xxl={8} xl={7} xs={12}>
                    <RaceHeader race={raceState} />
                    <Col className={"flex-center justify-content-between py-2"}>
                        <div className={"fs-1 align-self-center"}>
                            <RaceTimer race={raceState} />
                        </div>
                        <div className={"align-self-center"}>
                            <RaceActions race={raceState} user={user} />
                        </div>
                    </Col>
                    <div className={"d-lg-none"}>
                        <RaceParticipantOverview race={raceState} />
                    </div>
                    <div className={"pb-4"}>
                        <RaceParticipantDetail race={raceState} />
                    </div>
                </Col>
                <Col xxl={4} xl={5} className={"d-none d-lg-block"}>
                    {/* This instance of RaceParticipantOverview will show on xl screens and up */}
                    <div className={"sticky-top"} style={{ zIndex: 999 }}>
                        <RaceParticipantOverview race={raceState} />
                    </div>
                </Col>
            </Row>
        </>
    );
};
