'use client';

import React from 'react';
import { useStopwatch } from 'react-timer-hook';

export const useSpeedrunTimer = (initialOffset = 0, autoStart = false) => {
    const stopwatchInitialOffset = new Date();
    stopwatchInitialOffset.setSeconds(
        stopwatchInitialOffset.getSeconds() + Math.abs(initialOffset),
    );

    const { days, hours, minutes, seconds, start, pause, reset } = useStopwatch(
        {
            autoStart,
            offsetTimestamp: stopwatchInitialOffset,
        },
    );

    const formatHours = (value: number): string => {
        if (value === 0) return '';

        return `${String(value).padStart(2, '0')}:`;
    };

    const formatMinutes = (value: number): string => {
        if (value < 0) return '00';

        return `${String(value).padStart(2, '0')}:`;
    };

    const formatSeconds = (value: number): string => {
        return String(value).padStart(2, '0');
    };

    const startTimer = () => {
        start();
    };

    const stopTimer = () => {
        pause();
    };

    const setTime = (offset: number) => {
        const stopwatchOffset = new Date();
        stopwatchOffset.setSeconds(stopwatchOffset.getSeconds() + offset);

        reset(stopwatchOffset, autoStart);
    };

    const render = () => {
        return (
            <span suppressHydrationWarning={true}>
                {formatHours(hours + days * 24)}
                {formatMinutes(minutes)}
                {formatSeconds(seconds)}
            </span>
        );
    };

    return { render, setTime, startTimer, stopTimer };
};
