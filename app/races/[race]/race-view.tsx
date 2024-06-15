"use client";

import {
    Race,
    RaceMessage,
    RaceParticipantWithLiveData,
} from "~app/races/races.types";
import { User } from "../../../types/session.types";
import { Col, Row } from "react-bootstrap";
import React, { useEffect, useState } from "react";
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
import { RaceChat } from "~app/races/[race]/race-chat";
import { RaceAdminActions } from "~app/races/[race]/race-admin-actions";
import { RaceStartConditionInformation } from "~app/races/[race]/race-start-condition-information";
import { RaceStats } from "~app/races/[race]/race-stats";
import { RaceProgressGraph } from "~app/races/[race]/race-progress-graph";
import { getRaceMessages } from "~src/lib/races";

interface RaceDetailProps {
    race: Race;
    user?: User;
    messages: RaceMessage[];
}

export const RaceDetail = ({ race, user, messages }: RaceDetailProps) => {
    const { raceState, messagesState, setMessagesState } = useRace(
        race,
        messages,
    );
    const [stream, setStream] = useState(getInitialRaceStream(raceState));

    const breadcrumbs: BreadcrumbItem[] = [
        { content: "Races", href: "/races" },
        { content: race.raceId },
    ];

    useEffect(() => {
        const fetchRaceMessages = async () => {
            const res = await getRaceMessages(race.raceId);
            setMessagesState(res);
        };

        fetchRaceMessages();
    }, [race.raceId, setMessagesState]);

    return (
        <>
            <Breadcrumb breadcrumbs={breadcrumbs} />
            <Row>
                <Col xxl={8} lg={7} xs={12}>
                    <RaceHeader race={raceState} />
                    <Col className="flex-center justify-content-between py-2">
                        {raceState.status !== "pending" && (
                            <div className="fs-1 align-self-center">
                                <RaceTimer race={raceState} />
                            </div>
                        )}
                        {raceState.status === "pending" && (
                            <div className="fs-3 align-self-center">
                                <RaceStartConditionInformation
                                    race={raceState}
                                />
                            </div>
                        )}
                    </Col>
                    <div className="d-lg-none">
                        <RaceParticipantOverview race={raceState} />
                        <RaceActions race={raceState} user={user} />
                        <RaceChat
                            user={user}
                            raceMessages={messagesState}
                            race={raceState}
                        />
                        <RaceStats race={race} />
                    </div>
                    <div className="pb-4">
                        <RaceParticipantDetail
                            race={raceState}
                            setStream={setStream}
                        />
                    </div>
                    <div className="pb-4 d-none d-sm-block">
                        <RaceProgressGraph
                            race={raceState}
                            messages={messagesState}
                        />
                    </div>
                </Col>
                <Col xxl={4} lg={5} className="d-none d-lg-block">
                    <RaceParticipantOverview race={raceState} />
                    <RaceActions race={raceState} user={user} />
                    <RaceAdminActions race={raceState} user={user} />
                    <RaceChat
                        raceMessages={messagesState}
                        race={raceState}
                        user={user}
                    />
                    <RaceStats race={race} />
                    <RaceStream stream={stream} />
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
