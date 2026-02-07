'use client';
import React from 'react';
import {
    type RunResult,
    type SearchResults,
    type UserResult,
} from './find-user-or-run';

export interface AggregatedResults {
    users: Record<string, UserResult>;
    games: Record<string, RunResult[]>;
}

export const STORAGE_KEY = 'globalSearchResults';

const DEFAULT_AGGREGATED_RESULTS: AggregatedResults = {
    users: {},
    games: {},
};

export const useAggregatedResults = (
    searchResults: SearchResults | undefined,
): AggregatedResults => {
    const initialResults = React.useMemo(() => {
        const storedResults = sessionStorage.getItem(STORAGE_KEY);
        if (!storedResults) return DEFAULT_AGGREGATED_RESULTS;

        try {
            return JSON.parse(storedResults) as AggregatedResults;
        } catch (_err) {
            return DEFAULT_AGGREGATED_RESULTS;
        }
    }, []);

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const aggregatedResults = React.useMemo(() => {
        if (!searchResults) return initialResults;

        const newResults: AggregatedResults = {
            users: { ...initialResults.users },
            games: { ...initialResults.games },
        };

        for (const user of searchResults.users) {
            if (!newResults.users[user.user]) {
                newResults.users[user.user] = user;
            }
        }

        for (const run of searchResults.runs) {
            if (!newResults.games[run.game]) {
                newResults.games[run.game] = [];
            }
            const exists = newResults.games[run.game].some(
                (r) => r.url === run.url,
            );
            if (!exists) {
                newResults.games[run.game].push(run);
            }
        }

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newResults));

        return newResults;
    }, [initialResults, searchResults]);

    return aggregatedResults;
};
