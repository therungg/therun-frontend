import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";
import { sortRaceParticipants } from "~app/races/[race]/sort-race-participants";
import ProgressBar from "react-bootstrap/ProgressBar";
import { Col } from "react-bootstrap";

interface RaceParticipantOverviewProps {
    race: Race;
}

export const RaceParticipantOverview = ({
    race,
}: RaceParticipantOverviewProps) => {
    const participants = sortRaceParticipants(race);
    return (
        <>
            {participants?.map((participant, i) => {
                return (
                    <RaceParticipantItem
                        placing={i + 1}
                        key={participant.user}
                        participant={participant}
                    />
                );
            })}
        </>
    );
};

export const RaceParticipantItem = ({
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
        <div className={"d-flex flex-row"}>
            <Col xl={4}>
                {placing}. {participant.user}
            </Col>
            {/*<div>*/}
            {/*    PB: <DurationToFormatted duration={participant.pb} />*/}
            {/*</div>*/}
            {/*<div>Status: {participant.status}</div>*/}
            {/*<div>*/}
            {/*    Time:{" "}*/}
            {/*    <DurationToFormatted*/}
            {/*        duration={participant.liveData?.currentTime as number}*/}
            {/*    />*/}
            {/*</div>*/}
            {/*<Col xl={3}>{participant.liveData?.currentSplitName}</Col>*/}
            {/*<div>*/}
            {/*    Predicted end time:{" "}*/}
            {/*    <DurationToFormatted*/}
            {/*        duration={participant.liveData?.currentPrediction as number}*/}
            {/*    />*/}
            {/*</div>*/}
            {/*<div>*/}
            {/*    Best Possible time:{" "}*/}
            {/*    <DurationToFormatted*/}
            {/*        duration={participant.liveData?.bestPossibleTime as number}*/}
            {/*    />*/}
            {/*</div>*/}
            {/*<div>*/}
            {/*    Time to next split:{" "}*/}
            {/*    <DurationToFormatted*/}
            {/*        duration={participant.liveData?.timeToNextSplit as number}*/}
            {/*    />*/}
            {/*</div>*/}
            {/*<div>*/}
            {/*    Delta:{" "}*/}
            {/*    <DifferenceFromOne*/}
            {/*        diff={participant.liveData?.delta as number}*/}
            {/*    />*/}
            {/*</div>*/}
            <Col xl={8}>
                {participant.liveData && (
                    <ProgressBar
                        animated
                        max={100}
                        label={
                            percentage > 9 ? `${percentage.toFixed(0)}%` : ""
                        }
                        now={percentage}
                    />
                )}
            </Col>
        </div>
    );
};
