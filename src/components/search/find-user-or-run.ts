import { cacheLife } from 'next/cache';

export interface RunData {
    game: string;
    pb: string;
    pbgt: string;
    run: string;
    user: string;
}

export interface SearchResults {
    categories: {
        [category: string]: RunData[];
    };
    games: {
        [game: string]: RunData[];
    };
    users: {
        [user: string]: RunData[];
    };
}

// Same as API on empty result
export const DEFAULT_SEARCH_RESULTS = {
    categories: {},
    games: {},
    users: {},
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
