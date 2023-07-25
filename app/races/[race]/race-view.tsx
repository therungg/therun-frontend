"use client";

import { Race } from "~app/races/races.types";

interface RaceDetailProps {
    race: Race;
}

export const RaceDetail = ({ race }: RaceDetailProps) => {
    return <div>{JSON.stringify(race)}</div>;
};
