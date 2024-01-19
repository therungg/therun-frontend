import React from "react";
import { useStopwatch } from "react-timer-hook";

export const SpeedrunTimer = ({
    secondsOffset = 0,
    autoStart = false,
}: {
    secondsOffset?: number;
    autoStart?: boolean;
}) => {
    const stopwatchOffset = new Date();
    stopwatchOffset.setSeconds(stopwatchOffset.getSeconds() + secondsOffset);

    const { hours, minutes, seconds } = useStopwatch({
        autoStart,
        offsetTimestamp: stopwatchOffset,
    });
    const formatHours = (value: number): string => {
        if (value === 0) return "";

        return `${String(value).padStart(2, "0")}:`;
    };

    const formatMinutes = (value: number): string => {
        if (value < 0) return "00";

        return `${String(value).padStart(2, "0")}:`;
    };

    const formatSeconds = (value: number): string => {
        return String(value).padStart(2, "0");
    };

    return (
        <span suppressHydrationWarning={true}>
            {formatHours(hours)}
            {formatMinutes(minutes)}
            {formatSeconds(seconds)}
        </span>
    );
};
