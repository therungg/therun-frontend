"use client";

import {
    Race,
    RaceParticipant,
    WebsocketRaceMessage,
} from "~app/races/races.types";
import { Button, Col, Form, Row } from "react-bootstrap";

import { User } from "../../types/session.types";
import { useEffect, useState } from "react";
import { arrayToMap } from "~src/utils/array";
import {
    useAllRacesWebsocket,
    useUserRaceParticipationsWebsocket,
} from "~src/components/websocket/use-reconnect-websocket";
import { Can } from "~src/rbac/Can.component";
import { createFictionalTestRace } from "~src/actions/races/create-fictional-test-race.action";
import { SubmitButton } from "~src/actions/components/submit-button";
import { InProgressRaces } from "~app/races/in-progress-races";
import { PendingRaces } from "~app/races/pending-races";

interface RaceOverviewProps {
    pendingRaces: Race[];
    inProgressRaces: Race[];
    user?: User;
    raceParticipations: RaceParticipant[];
}

//TODO: Very basic first page that just shows some functionality. Proof of concept only.
export const RaceOverview = ({
    pendingRaces,
    inProgressRaces,
    user,
    raceParticipations,
}: RaceOverviewProps) => {
    const [statePendingRaces, setStatePendingRaces] = useState(pendingRaces);
    const [stateInProgressRaces, setStateInProgressPendingRaces] =
        useState(inProgressRaces);
    const [raceParticipationMap, setRaceParticipationMap] = useState(
        arrayToMap<RaceParticipant, "raceId">(raceParticipations, "raceId"),
    );

    const lastMessage = useAllRacesWebsocket();
    const userParticipationMessage = useUserRaceParticipationsWebsocket(user);

    const raceMessageIsValid = (message: WebsocketRaceMessage<Race>) => {
        return message !== null && message.data && message.data.raceId;
    };
    const participationMessageIsValid = (
        message: WebsocketRaceMessage<RaceParticipant>,
    ) => {
        return (
            message !== null &&
            message.data &&
            message.data.raceId &&
            userParticipationMessage.data.user === user?.username
        );
    };

    useEffect(() => {
        if (raceMessageIsValid(lastMessage)) {
            if (lastMessage.data.status === "progress") {
                const newRaces = JSON.parse(
                    JSON.stringify(stateInProgressRaces),
                );

                const index = stateInProgressRaces.findIndex(
                    (race) => race.raceId === lastMessage.data.raceId,
                );

                if (index !== -1) {
                    newRaces[index] = lastMessage.data;
                } else {
                    newRaces.unshift(lastMessage.data);
                }
                setStateInProgressPendingRaces(newRaces);
            } else if (
                lastMessage.data.status === "starting" ||
                lastMessage.data.status === "pending"
            ) {
                const newRaces = JSON.parse(JSON.stringify(statePendingRaces));

                const index = statePendingRaces.findIndex(
                    (race) => race.raceId === lastMessage.data.raceId,
                );

                if (index !== -1) {
                    newRaces[index] = lastMessage.data;
                } else {
                    newRaces.unshift(lastMessage.data);
                }
                setStatePendingRaces(newRaces);
            }
        }
    }, [lastMessage]);

    useEffect(() => {
        if (participationMessageIsValid(userParticipationMessage)) {
            const newRaceParticipationMap = arrayToMap<
                RaceParticipant,
                "raceId"
            >(Array.from(raceParticipationMap.values()), "raceId");

            if (
                userParticipationMessage.data.status === "unjoined" &&
                newRaceParticipationMap.has(
                    userParticipationMessage.data.raceId,
                )
            ) {
                newRaceParticipationMap.delete(
                    userParticipationMessage.data.raceId,
                );
            } else {
                newRaceParticipationMap.set(
                    userParticipationMessage.data.raceId,
                    userParticipationMessage.data,
                );
            }

            setRaceParticipationMap(newRaceParticipationMap);
        }
    }, [userParticipationMessage]);

    return (
        <div>
            <h1>Races</h1>
            <div className={"flex-center mb-4"}>
                <Can I={"create"} a={"race"}>
                    <a href={"/races/create"}>
                        <Button>Create race</Button>
                    </a>
                </Can>
                <Can I={"moderate"} a={"race"}>
                    <Form action={createFictionalTestRace}>
                        <SubmitButton
                            innerText={"Create Fictional Test Race"}
                            pendingText={"Creating Race..."}
                        />
                    </Form>
                </Can>
            </div>
            <Row>
                <Col>
                    <h2>In progress Races</h2>
                    <InProgressRaces races={stateInProgressRaces} />
                </Col>
                <Col>
                    <h2>Upcoming Races</h2>
                    <PendingRaces
                        races={statePendingRaces}
                        raceParticipationMap={raceParticipationMap}
                    />
                </Col>
            </Row>
        </div>
    );
};
