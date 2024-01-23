"use server";

import {
    ActiveRaces,
    GameStats,
    GlobalStats,
    PaginatedRaces,
    Race,
    RaceParticipant,
} from "~app/races/races.types";
import { PaginationFetcher } from "~src/components/pagination/pagination.types";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;
const paginationPageSize = 10;

export const getPaginatedFinishedRaces: PaginationFetcher<Race> = async (
    page = 1,
    pageSize = paginationPageSize,
): Promise<PaginatedRaces> => {
    const races = await fetch(
        `${racesApiUrl}?page=${page}&pageSize=${pageSize}`,
        { next: { revalidate: 0 } },
    );

    return (await races.json()).result as PaginatedRaces;
};

export const getPaginatedFinishedRacesByGame = async (
    game: string,
    page = 1,
    pageSize = paginationPageSize,
): Promise<PaginatedRaces> => {
    const races = await fetch(
        `${racesApiUrl}?page=${page}&pageSize=${pageSize}&game=${game}`,
        {
            next: { revalidate: 0 },
        },
    );

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

export const getGlobalRaceStats = async (): Promise<GlobalStats> => {
    const url = `${racesApiUrl}/stats`;

    const races = await fetch(url, { next: { revalidate: 0 } });

    return (await races.json()).result as GlobalStats;
};

export const getRaceGameStats = async (): Promise<GameStats[]> => {
    const url = `${racesApiUrl}/stats/games`;

    const races = await fetch(url, { next: { revalidate: 0 } });

    return ((await races.json()).result as GameStats[])
        .sort((a, b) => {
            // Hack because api returns ties in totalGames randomly.
            if (a.totalRaces === b.totalRaces) {
                return b.totalRaceTime - a.totalRaceTime;
            }

            return 1;
        })
        .slice(0, 3);
};
