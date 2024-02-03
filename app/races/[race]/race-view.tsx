"use client";

import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";
import { User } from "../../../types/session.types";
import { Col, Row } from "react-bootstrap";
import React, { useState } from "react";
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
import { RaceStream } from "~app/races/[race]/race-stream";

interface RaceDetailProps {
    race: Race;
    user?: User;
}

export const RaceDetail = ({ race, user }: RaceDetailProps) => {
    const raceState = useRace(race);
    const [stream, setStream] = useState(getInitialRaceStream(raceState));

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
                    </Col>
                    <div className={"d-lg-none"}>
                        <RaceActions race={raceState} user={user} />
                    </div>
                    <div className={"pb-4"}>
                        <RaceParticipantDetail
                            race={raceState}
                            setStream={setStream}
                        />
                    </div>
                </Col>
                <Col xxl={4} xl={5} className={"d-none d-lg-block"}>
                    {/* This instance of RaceParticipantOverview will show on xl screens and up */}
                    <RaceActions race={raceState} user={user} />
                    <RaceStream stream={stream} />
                    <div className={"sticky-top"} style={{ zIndex: 999 }}>
                        <RaceParticipantOverview race={raceState} />
                    </div>
                </Col>
            </Row>
        </>
    );
};

const getInitialRaceStream = (race: Race) => {
    const participants = race.participants as RaceParticipantWithLiveData[];

    if (race.forceStream) return race.forceStream;

    const firstTwitchStreamingParticipant = participants.find(
        (participant) => participant.liveData?.streaming,
    );

    if (firstTwitchStreamingParticipant)
        return firstTwitchStreamingParticipant.user;

    if (participants.length > 0) return participants[0].user;

    return "";
};
