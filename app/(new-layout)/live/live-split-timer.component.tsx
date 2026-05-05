'use client';

import React from 'react';
import runStyles from '~src/components/css/LiveRun.module.scss';
import { Flag } from '~src/components/live/live-user-run';
import { getSplitStatus } from '~src/components/live/recommended-stream';
import {
    DifferenceFromOne,
    DurationAsTimer,
} from '~src/components/util/datetime';
import { LiveRun } from './live.types';
import { useLiveElapsedMs } from './use-live-elapsed-ms';

interface LiveSplitTimerComponentProps {
    liveRun: LiveRun;
    dark: boolean;
    withDiff?: boolean;
    className?: string | null;
    timerClassName?: string | null;
    splitTime?: boolean;
}

export const LiveSplitTimerComponent: React.FunctionComponent<
    LiveSplitTimerComponentProps
> = ({
    liveRun,
    dark,
    withDiff = true,
    className = null,
    timerClassName = null,
    splitTime = false,
}) => {
    const liveElapsedMs = useLiveElapsedMs(liveRun);

    const formatHours = (value: number): string => {
        if (value < 0) return '-00';

        return String(value).padStart(2, '0');
    };

    const formatMinutes = (value: number): string => {
        if (value < 0) value++;

        return String(Math.abs(value)).padStart(2, '0');
    };

    const formatSeconds = (value: number): string => {
        return String(Math.abs(value)).padStart(2, '0');
    };

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
                                    className={`d-flex justify-content-end ${timerClassName}`}
                                >
                                    <DurationAsTimer
                                        duration={
                                            lastSplitStatus?.singleTime?.toString() ||
                                            ''
                                        }
                                    />
                                </div>
                                {withDiff && (
                                    <DifferenceFromOne diff={liveRun.delta} />
                                )}
                            </>
                        )}

                        {!splitTime && (
                            <div>
                                <div
                                    className={
                                        'd-flex align-items-center justify-content-end ' +
                                        timerClassName
                                    }
                                >
                                    <Flag
                                        className="me-2"
                                        height={16}
                                        dark={dark}
                                    />
                                    <DurationAsTimer
                                        duration={
                                            lastSplitStatus?.time?.toString() ||
                                            ''
                                        }
                                    />
                                </div>
                                {withDiff && (
                                    <DifferenceFromOne diff={liveRun.delta} />
                                )}
                            </div>
                        )}
                    </>
                )}
            {liveRun.currentSplitIndex < liveRun.splits.length &&
                !liveRun.hasReset &&
                (() => {
                    const cumulative = liveElapsedMs ?? 0;
                    const prev =
                        liveRun.currentSplitIndex === 0
                            ? 0
                            : (liveRun.splits[liveRun.currentSplitIndex - 1]
                                  ?.splitTime ?? 0);
                    const displayMs = splitTime
                        ? Math.max(0, cumulative - prev)
                        : cumulative;
                    const totalSec = Math.floor(displayMs / 1000);
                    const h = Math.floor(totalSec / 3600);
                    const m = Math.floor((totalSec % 3600) / 60);
                    const s = totalSec % 60;
                    return (
                        <div>
                            <div className={timerClassName}>
                                {formatHours(h)}:{formatMinutes(m)}:
                                {formatSeconds(s)}
                            </div>
                            {withDiff && !splitTime && (
                                <DifferenceFromOne
                                    diff={liveRun.delta}
                                    withMillis={true}
                                />
                            )}
                        </div>
                    );
                })()}

            {liveRun.hasReset && (
                <div
                    className={timerClassName}
                    style={{ color: 'var(--bs-danger)', opacity: 0.7 }}
                >
                    {splitTime ? '-' : 'Reset'}
                </div>
            )}
        </>
    );
};
