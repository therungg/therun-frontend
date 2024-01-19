import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";
import { Col, Row } from "react-bootstrap";
import { getPercentageDoneFromLiverun } from "~app/races/[race]/get-percentage-done-from-liverun";
import React, { useState } from "react";
import { TwitchEmbed } from "react-twitch-embed";
import { Line } from "rc-progress";
import {
    DifferenceFromOne,
    DurationToFormatted,
} from "~src/components/util/datetime";
import { UserLink } from "~src/components/links/links";
import { Twitch as TwitchIcon } from "react-bootstrap-icons";
import styles from "../../../src/components/css/LiveRun.module.scss";
import { RaceParticipantTimer } from "~app/races/[race]/race-timer";
import { readableRaceParticipantStatus } from "~app/races/[race]/readable-race-status";

interface RaceParticipantDetailProps {
    race: Race;
}

const enableTwitchStreamFeature = true;

export const RaceParticipantDetail = ({ race }: RaceParticipantDetailProps) => {
    const participants = race.participants as RaceParticipantWithLiveData[];
    const firstTwitchStreamingParticipant =
        enableTwitchStreamFeature &&
        participants.find((participant) => participant.liveData?.streaming);
    const [stream, setStream] = useState(firstTwitchStreamingParticipant?.user);
    const highlightedRunIndex = participants?.findIndex(
        (participant) => participant.user === stream,
    );
    const highlightedParticipant =
        highlightedRunIndex > -1 ? participants[highlightedRunIndex] : null;

    return (
        <div>
            <Row>
                {enableTwitchStreamFeature && stream && (
                    <Col xl={6} className={"mb-3"}>
                        <TwitchEmbed
                            channel={stream}
                            width={"100%"}
                            height={295}
                            muted
                            withChat={false}
                        />
                    </Col>
                )}
                {highlightedParticipant && (
                    <Col xl={6}>
                        <RaceParticipantDetailView
                            placing={highlightedRunIndex + 1}
                            participant={highlightedParticipant}
                            isHighlighted={enableTwitchStreamFeature}
                        />
                    </Col>
                )}
                {participants?.map((participant, i) => {
                    if (highlightedParticipant?.user === participant.user)
                        return;

                    return (
                        <Col
                            key={participant.user}
                            xl={6}
                            onClick={() => {
                                setStream(participant.user);
                            }}
                        >
                            <RaceParticipantDetailView
                                placing={i + 1}
                                participant={participant}
                            />
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
};

export const RaceParticipantDetailView = ({
    participant,
    placing,
    isHighlighted = false,
}: {
    participant: RaceParticipantWithLiveData;
    placing: number;
    isHighlighted?: boolean;
}) => {
    const percentage = getPercentageDoneFromLiverun(participant);
    return (
        <div
            className={`px-4 pt-2 pb-3 ${
                isHighlighted ? "bg-body-tertiary" : "bg-body-secondary"
            } game-border mh-100 mb-3 ${
                enableTwitchStreamFeature && styles.liveRunContainer
            }`}
        >
            <div>
                <span className={"h3 flex-center"}>
                    <UserLink
                        username={participant.user}
                        parentIsUrl={false}
                        icon={false}
                    />

                    {participant.liveData?.streaming && (
                        <div className="ms-2">
                            <TwitchIcon height={22} color={"#6441a5"} />
                        </div>
                    )}
                    {participant.finalTime && (
                        <div className={"ms-4 fst-italic"}>
                            <DurationToFormatted
                                duration={participant.finalTime}
                            />
                        </div>
                    )}
                    {participant.status === "started" &&
                        participant.liveData?.startedAt && (
                            <div className={"ms-4"}>
                                <RaceParticipantTimer
                                    raceParticipant={participant}
                                />
                            </div>
                        )}
                </span>
            </div>
            <div className={"flex-center"}>
                {readableRaceParticipantStatus(participant.status)}
            </div>
            <div>
                Position: <b>{placing}</b>
            </div>
            <div>
                PB: <DurationToFormatted duration={participant.pb} />
            </div>
            <div>
                BPT: <DurationToFormatted duration={participant.pb} />
            </div>
            <div>
                <DifferenceFromOne
                    diff={participant.liveData?.delta as number}
                    className={""}
                />
            </div>
            <div>{percentage.toFixed(0)}% Done</div>
            {!participant.finalTime && (
                <div>
                    Current Split: {participant.liveData?.currentSplitName} (
                    {participant.liveData?.currentSplitIndex + 1}/
                    {participant.liveData?.totalSplits})
                </div>
            )}
            <Line percent={percentage} />
        </div>
    );
};
