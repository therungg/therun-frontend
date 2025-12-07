'use client';

import moment from 'moment/moment';
import React from 'react';
import { TwitchEmbed } from 'react-twitch-embed';

interface EventHighlight {
    name: string;
    stream: string;
    start: Date;
    end: Date;
    segments: {
        start: Date;
        end: Date;
    }[];
    description: string;
}

const currentEvent: EventHighlight = {
    name: 'Speedtember',
    stream: 'orangeisborange',
    start: new Date('2025-09-01 19:00'),
    end: new Date('2025-09-10 06:00'),
    segments: [],
    description:
        "Speedtember is a yearly speedrunning marathon hosted by Orangeisborange, raising funds for St. Jude's Children's Hospital.",
};

export const EventHighlight = () => {
    const hasStarted = new Date() > currentEvent.start;
    const hasEnded = new Date() > currentEvent.end;

    let info = '';
    if (!hasStarted) {
        info =
            `${currentEvent.name} is starting ` +
            moment(currentEvent.start).fromNow() +
            '!';
    } else if (hasEnded) {
        info = `${currentEvent.name} has ended. Thanks for watching!`;
    } else {
        `${currentEvent.name} is live right now!`;
    }
    return (
        <div className="bg-body-secondary mb-3 game-border px-4 py-3 mt-5 rounded-3">
            <span className="h3">Check out this event</span>
            <hr />
            <div className="mb-3">
                <span className="h5">{info}</span>
            </div>
            <TwitchEmbed
                className="card game-border ratio ratio-16x9 rounded overflow-hidden"
                channel={currentEvent.stream}
                width="100%"
                height="revert"
                muted
                withChat={false}
            />
        </div>
    );
};
