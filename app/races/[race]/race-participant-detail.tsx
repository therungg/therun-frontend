import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";
import { sortRaceParticipants } from "~app/races/[race]/sort-race-participants";
import { Col, Row } from "react-bootstrap";
import ProgressBar from "react-bootstrap/ProgressBar";
import {
    DifferenceFromOne,
    DurationToFormatted,
} from "~src/components/util/datetime";

interface RaceParticipantDetailProps {
    race: Race;
}

export const RaceParticipantDetail = ({ race }: RaceParticipantDetailProps) => {
    const participants = sortRaceParticipants(race);
    return (
        <Row>
            {participants?.map((participant, i) => {
                return (
                    <Col key={participant.user} xl={6}>
                        <RaceParticipantDetailView
                            placing={i + 1}
                            participant={participant}
                        />
                    </Col>
                );
            })}
        </Row>
    );
};

export const RaceParticipantDetailView = ({
    participant,
    placing,
}: {
    participant: RaceParticipantWithLiveData;
    placing: number;
}) => {
    const percentage = !participant.liveData
        ? 0
        : participant.liveData?.runPercentageTime * 100;
    return (
        <div
            className={
                "border border-2 border-white border-opacity-100 m-4 p-2"
            }
        >
            <Col xl={4}>
                {placing}. {participant.user}
            </Col>
            <hr />
            <div>
                PB: <DurationToFormatted duration={participant.pb} />
            </div>
            <div>Status: {participant.status}</div>
            {participant.liveData && (
                <div>
                    <div>
                        Time:{" "}
                        <DurationToFormatted
                            duration={
                                participant.liveData?.currentTime as number
                            }
                        />
                    </div>
                    <div>
                        Current split: {participant.liveData?.currentSplitName}{" "}
                        ({participant.liveData?.currentSplitIndex + 1}/
                        {participant.liveData?.totalSplits})
                    </div>
                    <div>
                        Predicted end time:{" "}
                        <DurationToFormatted
                            duration={
                                participant.liveData
                                    ?.currentPrediction as number
                            }
                        />
                    </div>
                    <div>
                        Best Possible time:{" "}
                        <DurationToFormatted
                            duration={
                                participant.liveData?.bestPossibleTime as number
                            }
                        />
                    </div>
                    <div>
                        Time to next split:{" "}
                        <DurationToFormatted
                            duration={
                                participant.liveData?.timeToNextSplit as number
                            }
                        />
                    </div>
                    <div>
                        Delta:{" "}
                        <DifferenceFromOne
                            diff={participant.liveData?.delta as number}
                        />
                    </div>
                    <div>
                        Final time:{" "}
                        {participant.finalTime && (
                            <DurationToFormatted
                                duration={participant.finalTime}
                            />
                        )}
                    </div>
                    <div>
                        {participant.liveData && (
                            <ProgressBar
                                animated
                                max={100}
                                label={
                                    percentage > 9
                                        ? `${percentage.toFixed(0)}%`
                                        : ""
                                }
                                now={percentage}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
