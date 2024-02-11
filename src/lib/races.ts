"use server";

import {
    GameStats,
    GlobalStats,
    PaginatedRaces,
    Race,
    RaceGameStatsByCategory,
    RaceGameStatsByGame,
    RaceMessage,
    RaceParticipant,
} from "~app/races/races.types";
import { PaginationFetcher } from "~src/components/pagination/pagination.types";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;
const paginationPageSize = 12;

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

export const getPaginatedFinishedRacesByGame: PaginationFetcher<Race> = async (
    page = 1,
    pageSize = paginationPageSize,
    query,
    initialData,
    params,
): Promise<PaginatedRaces> => {
    const races = await fetch(
        `${racesApiUrl}?page=${page}&pageSize=${pageSize}&game=${params.game}`,
        {
            next: { revalidate: 0 },
        },
    );

    return (await races.json()).result as PaginatedRaces;
};

export const getAllActiveRaces = async (): Promise<Race[]> => {
    const races = await fetch(`${racesApiUrl}/active`, {
        next: { revalidate: 0 },
    });

    return (await races.json()).result as Race[];
};

export const getAllActiveRacesByGame = async (
    game: string,
): Promise<Race[]> => {
    const races = await fetch(`${racesApiUrl}/active?game=${game}`, {
        next: { revalidate: 0 },
    });

    return (await races.json()).result as Race[];
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

    // Cache global stats 10 min for page speed
    const races = await fetch(url, { next: { revalidate: 60 } });

    return (await races.json()).result as GlobalStats;
};

export const getRaceGameStats = async (limit = 3): Promise<GameStats[]> => {
    let url = `${racesApiUrl}/stats/games`;

    if (limit > 0) {
        url += `?limit=${limit}`;
    }

    const races = await fetch(url, {
        next: { revalidate: limit > 0 && limit < 10 ? 10 : 60 * 60 },
    });

    return ((await races.json()).result as GameStats[]).sort((a, b) => {
        // Hack because api returns ties in totalGames randomly.
        if (a.totalRaces === b.totalRaces) {
            return b.totalRaceTime - a.totalRaceTime;
        }

        return 1;
    });
};

export const getRaceGameStatsByGame = async (
    game: string,
): Promise<RaceGameStatsByGame> => {
    const url = `${racesApiUrl}/stats/games/${game}`;

    const stats = await fetch(url, { next: { revalidate: 60 } });

    return (await stats.json()).result as RaceGameStatsByGame;
};

export const getRaceCategoryStats = async (game: string, category: string) => {
    const url = `${racesApiUrl}/stats/games/${game}/${category}`;

    const stats = await fetch(url, { next: { revalidate: 60 } });

    return (await stats.json()).result as RaceGameStatsByCategory;
};

export const getRaceMessages = async (
    raceId: string,
): Promise<RaceMessage[]> => {
    const url = `${racesApiUrl}/${raceId}/messages`;

    const messages = await fetch(url, { next: { revalidate: 0 } });

    return (await messages.json()).result;
};
