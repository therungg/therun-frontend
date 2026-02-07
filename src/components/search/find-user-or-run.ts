import { cacheLife } from 'next/cache';

export interface UserResult {
    user: string;
    picture: string;
    login: string;
    searchName: string;
    totalGames: number;
    totalCategories: number;
    totalTimePlayed: number;
    totalAttempts: number;
    totalFinishedAttempts: number;
}

export interface RunResult {
    user: string;
    game: string;
    category: string;
    url: string;
    pb: string;
    pbgt: string;
    attemptCount: number;
}

export interface SearchResults {
    users: UserResult[];
    runs: RunResult[];
}

// Same as API on empty result
export const DEFAULT_SEARCH_RESULTS: SearchResults = {
    users: [],
    runs: [],
};

export const findUserOrRun = async (term: string): Promise<SearchResults> => {
    'use cache';
    cacheLife('minutes');

    if (term.length < 2) return DEFAULT_SEARCH_RESULTS;

    const url = `${process.env.NEXT_PUBLIC_SEARCH_URL}?q=${term}`;

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const json = await res.json();

    return json.result;
};
