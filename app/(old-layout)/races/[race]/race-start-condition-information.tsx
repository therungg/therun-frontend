'use client';

import React from 'react';
import Countdown from 'react-countdown';
import { Race } from '~app/(old-layout)/races/races.types';
import { FromNow } from '~src/components/util/datetime';

export const RaceStartConditionInformation = ({ race }: { race: Race }) => {
    if (race.status !== 'pending') {
        return (
            <span>
                The race started <FromNow time={race.startTime as string} />
            </span>
        );
    }

    const startMethod = race.startMethod || 'everyone-ready';

    if (startMethod === 'everyone-ready') {
        if (race.participants && race.participants?.length < 2) {
            return <span>Waiting for more people to join the race...</span>;
        }
        return <span>Waiting for everyone to ready up...</span>;
    }

    if (startMethod === 'moderator') {
        if (race.participants && race.participants?.length < 2) {
            return <span>Waiting for more people to join the race...</span>;
        }
        const everyoneReady = race.participants?.every(
            (participant) => participant.status === 'ready',
        );
        if (!everyoneReady) {
            return <span>Waiting for everyone to ready up...</span>;
        }
        return (
            <span>
                The race will start when a moderator starts the countdown
            </span>
        );
    }

    if (startMethod === 'datetime' && race.willStartAt) {
        return (
            <span>
                The race will start automatically{' '}
                <Countdown
                    date={race.willStartAt}
                    renderer={({
                        days,
                        hours,
                        minutes,
                        seconds,
                        completed,
                    }) => {
                        if (completed) {
                            return 'within a few seconds';
                        }
                        const dayString = days > 0 ? `${days}d, ` : '';
                        const hourString =
                            hours > 0 || days > 0 ? `${hours}h ` : '';

                        const minuteString = `${minutes}m `;
                        const secondString = `${seconds}s`;

                        return (
                            <span suppressHydrationWarning={true}>
                                in {dayString}
                                {hourString}
                                {minuteString}
                                {secondString}
                            </span>
                        );
                    }}
                />
            </span>
        );
    }
};
