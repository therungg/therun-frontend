"use client";

import React, { useEffect, useState } from "react";
import runStyles from "~src/components/css/LiveRun.module.scss";
import { getSplitStatus } from "~src/components/live/recommended-stream";
import {
    DifferenceFromOne,
    DurationAsTimer,
} from "~src/components/util/datetime";
import { Flag } from "~src/components/live/live-user-run";
import Timer from "~src/vendor/timer/src";

export const LiveSplitTimerComponent = ({
    liveRun,
    dark,
    withDiff = true,
    className = null,
    timerClassName = null,
    splitTime = false,
}) => {
    const [timerStart, setTimerStart] = useState(0);
    React.useEffect(() => {
        const time =
            new Date().getTime() - new Date(liveRun.insertedAt).getTime() + 400;
        setTimerStart(time + (!splitTime ? liveRun.currentTime : 0));
    }, [liveRun.insertedAt, splitTime]);

    const [id, setId] = useState(0);

    const formatHours = (value: number): string => {
        if (value < 0) return "-00";

        return String(value).padStart(2, "0");
    };

    const formatMinutes = (value: number): string => {
        if (value < 0) value++;

        return String(Math.abs(value)).padStart(2, "0");
    };

    const formatSeconds = (value: number): string => {
        return String(Math.abs(value)).padStart(2, "0");
    };

    useEffect(() => {
        setId(id + 1);
    }, [liveRun.currentSplitIndex]);

    if (!className) className = runStyles.timerBody;
    if (!timerClassName) timerClassName = runStyles.timer;

    const lastSplitStatus = getSplitStatus(
        liveRun,
        liveRun.splits ? liveRun.splits.length - 1 : 0,
    );

    return (
        <>
            {liveRun.currentSplitIndex == liveRun.splits.length &&
                liveRun.splits[liveRun.splits.length - 1].splitTime && (
                    <>
                        {splitTime && (
                            <>
                                <div
                                    className={`d-flex justify-content-end
                                    ${timerClassName}`}
                                >
                                    <div>
                                        <b>
                                            <i>
                                                <DurationAsTimer
                                                    duration={
                                                        lastSplitStatus?.singleTime
                                                    }
                                                />
                                            </i>
                                        </b>
                                    </div>
                                </div>
                                {withDiff && (
                                    <DifferenceFromOne diff={liveRun.delta} />
                                )}
                            </>
                        )}

                        {!splitTime && (
                            <div className="d-flex justify-content-end">
                                <div className="d-flex">
                                    <Flag
                                        className="me-2"
                                        height={30}
                                        dark={dark}
                                    />
                                </div>
                                <div>
                                    <div
                                        className={`d-flex
                                       ${timerClassName}`}
                                    >
                                        <b>
                                            <i className="fs-big">
                                                <DurationAsTimer
                                                    duration={
                                                        lastSplitStatus?.time
                                                    }
                                                />
                                            </i>
                                        </b>
                                    </div>
                                    {withDiff && (
                                        <DifferenceFromOne
                                            diff={liveRun.delta}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            {liveRun.currentSplitIndex < liveRun.splits.length &&
                !liveRun.hasReset && (
                    <div key={liveRun.user + id}>
                        <div className={timerClassName}>
                            <Timer initialTime={timerStart}>
                                <Timer.Hours formatValue={formatHours} />:
                                <Timer.Minutes formatValue={formatMinutes} />
                                :
                                <Timer.Seconds formatValue={formatSeconds} />
                            </Timer>
                        </div>
                        {withDiff && (
                            <DifferenceFromOne
                                diff={liveRun.delta}
                                withMillis={true}
                            />
                        )}
                    </div>
                )}

            {liveRun.hasReset && (
                <div className={timerClassName}>
                    {splitTime ? "-" : "Reset"}
                </div>
            )}
        </>
    );
};
