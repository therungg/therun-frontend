"use server";

import {
    ActiveRaces,
    PaginatedRaces,
    Race,
    RaceParticipant,
} from "~app/races/races.types";
import { getBaseUrl } from "~src/actions/base-url.action";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export const getAllFinishedRaces = async (): Promise<PaginatedRaces> => {
    const races = await fetch(racesApiUrl, { next: { revalidate: 0 } });

    return (await races.json()).result as PaginatedRaces;
};

export const getAllFinishedRacesByGame = async (
    game: string,
): Promise<PaginatedRaces> => {
    const races = await fetch(`${racesApiUrl}?game=${game}`, {
        next: { revalidate: 0 },
    });

    return (await races.json()).result as PaginatedRaces;
};

export const getAllActiveRaces = async (): Promise<ActiveRaces> => {
    const races = await fetch(`${racesApiUrl}/active`, {
        next: { revalidate: 0 },
    });

    return (await races.json()).result as ActiveRaces;
};

export const getAllActiveRacesByGame = async (
    game: string,
): Promise<ActiveRaces> => {
    const races = await fetch(`${racesApiUrl}/active?game=${game}`, {
        next: { revalidate: 0 },
    });

    return (await races.json()).result as ActiveRaces;
};

export const getRaceParticipationsByUser = async (
    user?: string,
): Promise<RaceParticipant[] | undefined> => {
    if (!user) return;

    const url = `${racesApiUrl}/participations/${user}`;

    const races = await fetch(url, { next: { revalidate: 0 } });

    return (await races.json()).result as RaceParticipant[];
};

export const getRaceByRaceId = async (raceId: string): Promise<Race> => {
    const url = `${racesApiUrl}/${raceId}`;

    const races = await fetch(url, { next: { revalidate: 0 } });

    return (await races.json()).result as Race;
};

export const updateRaceStatus = async (
    raceId: string,
    action: string,
): Promise<Race> => {
    const baseUrl = await getBaseUrl();
    const url = `${baseUrl}/api/races/${raceId}/${action}`;

    const result = await fetch(url, {
        method: "POST",
    });

    return (await result.json()).result as Race;
};

export const deleteRace = async (raceId: string) => {
    const baseUrl = await getBaseUrl();
    const url = `${baseUrl}/api/races/${raceId}`;

    const result = await fetch(url, {
        method: "DELETE",
    });

    return (await result.json()).result;
};

export const joinRace = (raceId: string): Promise<Race> =>
    updateRaceStatus(raceId, "join");
export const unjoinRace = (raceId: string): Promise<Race> =>
    updateRaceStatus(raceId, "unjoin");
export const readyRace = (raceId: string): Promise<Race> =>
    updateRaceStatus(raceId, "ready");
export const unreadyRace = (raceId: string): Promise<Race> =>
    updateRaceStatus(raceId, "unready");

// eslint-disable-next-line no-unused-vars
export const canCreateRace = (sessionId: string): Promise<boolean> =>
    Promise.resolve(true); // TODO:: Endpoint is WIP, just returns true now. Will check if user can create race
