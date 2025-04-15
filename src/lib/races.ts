"use server";

import type {
    DetailedUserStats,
    GameStats,
    GlobalStats,
    PaginatedRaceMmrStats,
    PaginatedRaces,
    PaginatedRaceTimeStats,
    Race,
    RaceGameStatsByCategory,
    RaceGameStatsByGame,
    RaceMessage,
    RaceMmrStat,
    RaceParticipant,
    RaceTimeStat,
    UserStats,
} from "~app/(old-layout)/races/races.types";
import { type PaginationFetcher } from "~src/components/pagination/pagination.types";
import { URLSearchParams } from "next/dist/compiled/@edge-runtime/primitives";

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
    _query,
    _initialData,
    params,
): Promise<PaginatedRaces> => {
    const races = await fetch(
        `${racesApiUrl}?page=${page}&pageSize=${pageSize}&game=${
            params?.game ?? ""
        }`,
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

    return ((await races.json()).result as Race[]).sort((a, b) => {
        if (a.isFeatured) return -1;
        if (b.isFeatured) return 1;

        return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    });
};

export const getRacesByIds = async (ids: string[]): Promise<Race[]> => {
    const idsString = ids.join(",");
    const races = await fetch(`${racesApiUrl}?raceIds=${idsString}`, {
        next: { revalidate: 60 * 5 },
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

export const getUserRaceStats = async (user: string) => {
    const url = `${racesApiUrl}/stats/users/${user}`;

    const raceStats = await fetch(url, { next: { revalidate: 0 } });

    return (await raceStats.json()).result as UserStats;
};

export const getDetailedUserStats = async (user: string) => {
    const url = `${racesApiUrl}/stats/users/${user}/detailed`;

    const raceStats = await fetch(url, { next: { revalidate: 0 } });

    return (await raceStats.json()).result as DetailedUserStats;
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
    initialCall = false,
): Promise<RaceMessage[]> => {
    let url = `${racesApiUrl}/${raceId}/messages`;

    if (initialCall) {
        url += "?limit=50";
    }

    const messages = await fetch(url, { next: { revalidate: 0 } });

    return (await messages.json()).result;
};

export const getTimeLeaderboards = async (
    game: string,
    category: string,
    page = 1,
    pageSize = 10,
    unique: boolean = true,
    month: string | null = null,
): Promise<PaginatedRaceTimeStats> => {
    const searchParams = new URLSearchParams();

    searchParams.set("page", page.toString());
    searchParams.set("pageSize", pageSize.toString());

    if (month) {
        searchParams.set("month", month);
    }

    if (unique) {
        searchParams.set("unique", "true");
    }

    const url = `${racesApiUrl}/timeLeaderboards/${game}/${category}?${searchParams.toString()}`;

    const messages = await fetch(url, { next: { revalidate: 0 } });

    return (await messages.json()).result;
};

export const getMmrLeaderboards = async (
    game: string,
    category: string,
    page = 1,
    pageSize = 10,
): Promise<PaginatedRaceMmrStats> => {
    const searchParams = new URLSearchParams();

    searchParams.set("page", page.toString());
    searchParams.set("pageSize", pageSize.toString());

    const url = `${racesApiUrl}/mmrLeaderboards/${game}/${category}?${searchParams.toString()}`;

    const messages = await fetch(url, { next: { revalidate: 0 } });

    return (await messages.json()).result;
};

export const getTimeAndMmrLeaderboards = async (
    game: string,
    category: string,
    page = 1,
    pageSize = 3,
    month: string | null = null,
): Promise<{
    timeLeaderboards: RaceTimeStat[];
    mmrLeaderboards: RaceMmrStat[];
}> => {
    const promises = [
        getTimeLeaderboards(game, category, page, pageSize, false, month),
        getMmrLeaderboards(game, category, page, pageSize),
    ];

    const [timeLeaderboards, mmrLeaderboards] = await Promise.all(promises);

    return {
        timeLeaderboards: timeLeaderboards.items as RaceTimeStat[],
        mmrLeaderboards: mmrLeaderboards.items as RaceMmrStat[],
    };
};
