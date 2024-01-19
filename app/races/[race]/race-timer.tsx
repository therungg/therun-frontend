"use client";

import { Race } from "~app/races/races.types";
import { SpeedrunTimer } from "~src/components/timer";
import React from "react";

export const RaceTimer = ({ race }: { race: Race }) => {
    const offset =
        race.status === "progress" && race.startTime
            ? (new Date().getTime() - new Date(race.startTime).getTime()) / 1000
            : 0;

    return (
        <SpeedrunTimer
            secondsOffset={offset}
            autoStart={race.status === "progress"}
        />
    );
};
