import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";
import {
    DifferenceFromOne,
    DurationToFormatted,
} from "~src/components/util/datetime";
import { sortRaceParticipants } from "~app/races/[race]/sort-race-participants";
import ProgressBar from "react-bootstrap/ProgressBar";

interface RaceParticipantOverviewProps {
    race: Race;
}

export const RaceParticipantOverview = ({
    race,
}: RaceParticipantOverviewProps) => {
    const participants = sortRaceParticipants(race);
    return (
        <>
            {participants?.map((participant) => {
                return (
                    <RaceParticipantItem
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
}: {
    participant: RaceParticipantWithLiveData;
}) => {
    const percentage = !participant.liveData
        ? 0
        : participant.liveData?.runPercentageTime * 100;
    return (
        <div className={"d-flex flex-row"}>
            <div className={"col-1"}>{participant.user}</div>
            <div className={"col-1"}>
                PB: <DurationToFormatted duration={participant.pb} />
            </div>
            <div className={"col-1"}>Status: {participant.status}</div>
            <div className={"col-1"}>
                Time:{" "}
                <DurationToFormatted
                    duration={participant.liveData?.currentTime as number}
                />
            </div>
            <div className={"col-1"}>
                Split: {participant.liveData?.currentSplitName}
            </div>
            <div className={"col-1"}>
                Predicted end time:{" "}
                <DurationToFormatted
                    duration={participant.liveData?.currentPrediction as number}
                />
            </div>
            <div className={"col-1"}>
                Best Possible time:{" "}
                <DurationToFormatted
                    duration={participant.liveData?.bestPossibleTime as number}
                />
            </div>
            <div className={"col-1"}>
                Time to next split:{" "}
                <DurationToFormatted
                    duration={participant.liveData?.timeToNextSplit as number}
                />
            </div>
            <div className={"col-1"}>
                Delta:{" "}
                <DifferenceFromOne
                    diff={participant.liveData?.delta as number}
                />
            </div>
            <div className={"col-4"}>
                {participant.liveData && (
                    <ProgressBar
                        animated
                        label={
                            percentage > 9 ? `${percentage.toFixed(0)}%` : ""
                        }
                        now={percentage}
                    />
                )}
            </div>
        </div>
    );
};
