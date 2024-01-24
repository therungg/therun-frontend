import { RaceParticipantWithLiveData } from "~app/races/races.types";

export const RaceParticipantPercentage = ({
    participant,
}: {
    participant: RaceParticipantWithLiveData;
}) => {
    let percentage = 0;

    if (participant.liveData) {
        percentage =
            participant.liveData.runPercentageTime ||
            participant.liveData.runPercentageSplits;
    }

    percentage *= 100;

    return <>{percentage.toFixed(2)}%</>;
};
