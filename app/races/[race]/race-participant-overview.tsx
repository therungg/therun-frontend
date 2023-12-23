import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";
import { DurationToFormatted } from "~src/components/util/datetime";
import { Line } from "rc-progress";

interface RaceParticipantOverviewProps {
    race: Race;
}

export const RaceParticipantOverview = ({
    race,
}: RaceParticipantOverviewProps) => {
    return (
        <>
            {race.participants?.map((participant) => {
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
    return (
        <div className={"d-flex flex-row"}>
            <div className={"col-1"}>{participant.user}</div>
            <div className={"col-1"}>
                <DurationToFormatted
                    duration={participant.liveData?.currentTime}
                />
            </div>
            <div className={"col-1"}>
                {participant.liveData?.currentSplitName}
            </div>
            <div className={"col-1"}>
                {participant.liveData &&
                    `${(participant.liveData?.runPercentageTime * 100).toFixed(
                        0,
                    )}%`}
                {participant.liveData && (
                    <Line
                        percent={participant.liveData?.runPercentageTime * 100}
                        strokeWidth={4}
                        strokeColor="#D3D3D3"
                    />
                )}
            </div>
        </div>
    );
};
