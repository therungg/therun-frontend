import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";
import { Col, Row } from "react-bootstrap";
import React from "react";
import { UserLink } from "~src/components/links/links";
import { Twitch as TwitchIcon } from "react-bootstrap-icons";
import styles from "../../../src/components/css/LiveRun.module.scss";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
    DifferenceFromOne,
    DurationToFormatted,
} from "~src/components/util/datetime";
import { readableRaceParticipantStatus } from "~app/races/[race]/readable-race-status";
import { RaceParticipantTimer } from "~app/races/[race]/race-timer";
import { getPercentageDoneFromLiverun } from "~app/races/[race]/get-percentage-done-from-liverun";
import { RaceParticipantRatingDisplay } from "~app/races/components/race-participant-rating-display";

interface RaceParticipantDetailProps {
    race: Race;
    // eslint-disable-next-line no-unused-vars
    setStream: (user: string) => void;
}

export const RaceParticipantDetail = ({
    race,
    setStream,
}: RaceParticipantDetailProps) => {
    const participants = race.participants as RaceParticipantWithLiveData[];

    const [parent] = useAutoAnimate({
        duration: 300,
        easing: "ease-out",
    });

    return (
        <>
            <Row xs={1} md={2} xxl={3} className={"g-4"} ref={parent}>
                {participants?.map((participant, i) => {
                    return (
                        <Col
                            key={participant.user}
                            onClick={() => {
                                if (
                                    participant.liveData &&
                                    participant.liveData.streaming
                                ) {
                                    setStream(participant.user);
                                }
                            }}
                        >
                            <RaceParticipantDetailView
                                placing={i + 1}
                                participant={participant}
                                race={race}
                            />
                        </Col>
                    );
                })}
            </Row>
        </>
    );
};

export const RaceParticipantDetailView = ({
    participant,
    placing,
    race,
    isHighlighted = false,
}: {
    participant: RaceParticipantWithLiveData;
    placing: number;
    race: Race;
    isHighlighted?: boolean;
}) => {
    return (
        <div
            className={`px-4 pt-2 pb-1 card game-border h-100 ${
                isHighlighted ? "bg-body-tertiary" : "bg-body-secondary"
            } game-border mh-100 mb-3 ${
                participant.liveData &&
                participant.liveData.streaming &&
                styles.liveRunContainer
            }`}
        >
            <div>
                <span className={"justify-content-between w-100 d-flex"}>
                    <span className={"fs-3 text-nowrap"}>
                        <span className={"text-truncate"}>
                            <UserLink
                                username={participant.user}
                                parentIsUrl={false}
                                icon={false}
                            />
                        </span>
                        {participant.liveData?.streaming && (
                            <span className="ms-1">
                                <TwitchIcon height={22} color={"#6441a5"} />
                            </span>
                        )}
                    </span>
                    <span className={"fs-4"}>
                        {participant.status !== "abandoned" && (
                            <span className={"justify-content-end"}>
                                #{placing}
                            </span>
                        )}
                        {participant.status === "abandoned" && (
                            <span className={"justify-content-end"}>-</span>
                        )}
                    </span>
                </span>
            </div>
            <div className={"justify-content-between d-flex"}>
                <span>
                    {participant.pb && (
                        <span>
                            PB -{" "}
                            <span className={"fw-bold"}>
                                <DurationToFormatted
                                    duration={participant.pb}
                                />
                            </span>
                        </span>
                    )}
                    {!participant.pb && "No PB"}
                </span>
                <RaceParticipantRatingDisplay raceParticipant={participant} />
                {readableRaceParticipantStatus(participant.status)}
            </div>
            <hr style={{ margin: "0.7rem 0" }} />
            <div style={{ minHeight: "6.7rem" }} className={"d-flex"}>
                <RaceParticipantDetailBody
                    participant={participant}
                    race={race}
                />
            </div>
        </div>
    );
};

const RaceParticipantDetailBody = ({
    participant,
    race,
}: {
    participant: RaceParticipantWithLiveData;
    race: Race;
}) => {
    const abandonedTime =
        new Date(participant.abandondedAtDate as string).getTime() -
        new Date(race.startTime as string).getTime();

    const percentage = getPercentageDoneFromLiverun(participant);

    return (
        <div className={"w-100"}>
            <span className={"flex-center w-100 fs-4"}>
                {participant.status === "abandoned" && (
                    <>
                        Abandoned -{" "}
                        <span className={"ps-1"}>
                            <DurationToFormatted duration={abandonedTime} />
                        </span>
                    </>
                )}
                {participant.status !== "abandoned" && (
                    <RaceParticipantTimer raceParticipant={participant} />
                )}
            </span>
            <hr style={{ margin: "0.7rem 0" }} />
            {participant.liveData && participant.status === "started" && (
                <>
                    <div className={"justify-content-between d-flex"}>
                        <span>
                            BPT -{" "}
                            <span className={"fw-bold"}>
                                <DurationToFormatted
                                    duration={
                                        participant.liveData
                                            .bestPossibleTime as number
                                    }
                                />
                            </span>
                        </span>
                        <span>
                            <DifferenceFromOne
                                diff={participant.liveData.delta}
                            />
                        </span>
                    </div>
                    <div
                        className={
                            "justify-content-between d-flex w-100 flex-grow-1 p-0 m-0"
                        }
                    >
                        <span className={"text-truncate"}>
                            {participant.liveData.currentSplitIndex + 1}/
                            {participant.liveData.totalSplits} -{" "}
                            {participant.liveData.currentSplitName}
                        </span>
                        <span>{percentage}%</span>
                    </div>
                </>
            )}
            {race.status === "progress" && participant.status === "ready" && (
                <div
                    className={"flex-center align-items-center fst-italic h-50"}
                >
                    Awaiting Live Data...{" "}
                </div>
            )}
            {participant.comment && (
                <div
                    className={"fst-italic flex-center align-items-center h-50"}
                >
                    &quot;{participant.comment}&quot;
                </div>
            )}
        </div>
    );
};
