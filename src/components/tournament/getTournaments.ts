import { cacheLife } from 'next/cache';
import { safeEncodeURI } from '~src/utils/uri';

export const getTournaments = async () => {
    'use cache';
    cacheLife('minutes');

    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/tournaments/`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};

export const getTournamentByName = async (name: string) => {
    'use cache';
    cacheLife('seconds');

    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/tournaments/${name}`;

    const res = await fetch(url, { next: { tags: ['tournaments'] } });
    const json = await res.json();

    return json.result;
};

export const getTournamentStatsByName = async (name: string) => {
    'use cache';
    cacheLife('minutes');

    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/tournaments/${safeEncodeURI(name)}/stats`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};

export const banUserFromTournament = async (
    name: string,
    userString: string,
) => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/tournaments/${name}/removeUser/${userString}`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};
