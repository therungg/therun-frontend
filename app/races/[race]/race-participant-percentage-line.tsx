import { RaceParticipantWithLiveData } from "~app/races/races.types";
import { Line } from "rc-progress";
import React from "react";
import { getPercentageDoneFromLiverun } from "~app/races/[race]/get-percentage-done-from-liverun";

export const RaceParticipantPercentageLine = ({
    participant,
}: {
    participant: RaceParticipantWithLiveData;
}) => {
    const percentage = getPercentageDoneFromLiverun(participant);
    return <Line className={"w-100"} percent={percentage} />;
};
