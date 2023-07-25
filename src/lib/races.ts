import { Race } from "~app/races/races.types";
import { getBaseUrl } from "~src/actions/base-url.action";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export const getAllRaces = async (): Promise<Race[]> => {
    const races = await fetch(racesApiUrl, { next: { revalidate: 0 } });

    return (await races.json()).result as Race[];
};

export const getRaceByRaceId = async (raceId: string): Promise<Race> => {
    const url = `${racesApiUrl}/${raceId}`;

    const races = await fetch(url, { next: { revalidate: 0 } });

    return (await races.json()).result as Race;
};

export const joinRace = async (raceId: string): Promise<Race> => {
    const baseUrl = await getBaseUrl();

    const url = `${baseUrl}/api/races/${raceId}/join`;

    const result = await fetch(url, {
        method: "POST",
    });

    return (await result.json()).result as Race;
};
