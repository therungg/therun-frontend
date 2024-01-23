"use client";

import {
    GameStats,
    GlobalStats,
    PaginatedRaces,
    Race,
    RaceParticipant,
    WebsocketRaceMessage,
} from "~app/races/races.types";
import { Col, Row } from "react-bootstrap";

import { User } from "../../types/session.types";
import { useEffect, useState } from "react";
import { arrayToMap } from "~src/utils/array";
import {
    useAllRacesWebsocket,
    useUserRaceParticipationsWebsocket,
} from "~src/components/websocket/use-reconnect-websocket";
import { InProgressRaces } from "~app/races/in-progress-races";
import { PendingRaces } from "~app/races/pending-races";
import { FinishedRaces } from "~app/races/finished-races";
import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import { GlobalRaceStats } from "~app/races/global-race-stats";
import { CreateRaceButtons } from "~app/races/create-race-buttons";

interface RaceOverviewProps {
    pendingRaces: Race[];
    inProgressRaces: Race[];
    finishedRaces: PaginatedRaces;
    globalRaceStats: GlobalStats;
    globalGameStats: GameStats[];
    user?: User;
    raceParticipations: RaceParticipant[];
}

export const RaceOverview = ({
    pendingRaces,
    inProgressRaces,
    finishedRaces,
    globalRaceStats,
    globalGameStats,
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
            <div className={"d-flex"}>
                <h1>Races</h1>
                <span className={"mx-2 fst-italic"}>alpha</span>
            </div>
            <Row>
                <Col xl={8} lg={7} md={12}>
                    <InProgressRaces races={stateInProgressRaces} />
                </Col>
                <Col xl={4} lg={5} md={12}>
                    <PendingRaces races={statePendingRaces} />
                    <CreateRaceButtons />

                    <GlobalRaceStats
                        stats={globalRaceStats}
                        gameStats={globalGameStats}
                    />
                </Col>
            </Row>
            <hr />

            <PaginationContextProvider>
                <FinishedRaces races={finishedRaces} />
            </PaginationContextProvider>
        </div>
    );
};
