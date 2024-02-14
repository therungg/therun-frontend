"use client";

import {
    Race,
    RaceParticipantWithLiveData,
    RaceStatus,
} from "~app/races/races.types";
import { useSpeedrunTimer } from "~src/components/use-speedrun-timer";
import { useEffect } from "react";
import Countdown from "react-countdown";

export const RaceTimer = ({ race }: { race: Race }) => {
    const initialOffset = getTimerOffsetForRace(race);

    const timer = useSpeedrunTimer(initialOffset, race.status === "progress");

    useEffect(() => {
        timer.setTime(getTimerOffsetForRace(race));
        if (race.status === "progress") {
            timer.startTimer();
        }

        if (race.status === "finished") {
            timer.stopTimer();
        }
    }, [race.status]);

    if (race.status === "starting" && race.startTime) {
        return (
            <Countdown
                date={race.startTime}
                renderer={({ seconds, completed }) => {
                    if (!completed) {
                        return (
                            <span
                                suppressHydrationWarning={true}
                                className={"text-nowrap"}
                            >
                                Starts in {seconds}...
                            </span>
                        );
                    }
                }}
            />
        );
    }

    return timer.render();
};

export const RaceParticipantTimer = ({
    raceParticipant,
    raceStatus,
}: {
    raceParticipant: RaceParticipantWithLiveData;
    raceStatus: RaceStatus;
}) => {
    const initialOffset = raceParticipant.finalTime
        ? raceParticipant.finalTime / 1000
        : raceParticipant.liveData
          ? (new Date().getTime() -
                parseInt(raceParticipant.liveData.startedAt.toString())) /
            1000
          : 0;

    useEffect(() => {
        if (
            ["finished", "confirmed", "started"].includes(
                raceParticipant.status,
            )
        ) {
            const newoffset = raceParticipant.finalTime
                ? raceParticipant.finalTime / 1000
                : raceParticipant.liveData
                  ? (new Date().getTime() -
                        parseInt(
                            raceParticipant.liveData.startedAt.toString(),
                        )) /
                    1000
                  : 0;
            timer.setTime(newoffset);
        }
        if (["finished", "confirmed"].includes(raceParticipant.status)) {
            timer.stopTimer();
        }

        if (raceParticipant.status === "started") {
            timer.startTimer();
        }
    }, [raceParticipant.status]);

    useEffect(() => {
        if (raceStatus === "progress") {
            timer.startTimer();
        }
    }, [raceStatus]);

    const timer = useSpeedrunTimer(
        initialOffset,
        raceParticipant.status === "started",
    );

    return timer.render();
};

const getTimerOffsetForRace = (race: Race) => {
    let initialOffset = 0;

    if (race.status === "progress" && race.startTime) {
        initialOffset =
            (new Date().getTime() - new Date(race.startTime).getTime()) / 1000;
    } else if (race.status === "finished") {
        initialOffset =
            (new Date(race.endTime as string).getTime() -
                new Date(race.startTime as string).getTime()) /
            1000;
    }

    return initialOffset;
};
