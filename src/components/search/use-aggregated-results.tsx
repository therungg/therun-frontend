"use client";
import React from "react";
import { SearchResults } from "./find-user-or-run";

export type AggregatedResults = Omit<SearchResults, "categories">;
export const STORAGE_KEY = "globalSearchResults";

const DEFAULT_AGGREGATED_RESULTS: AggregatedResults = {
    users: {},
    games: {},
    // categories: {},
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
        const newAggregatedResults: AggregatedResults = { ...initialResults };

        (
            Object.keys(newAggregatedResults) as Array<keyof AggregatedResults>
        ).forEach((key) => {
            Object.entries(searchResults[key]).forEach(([item, data]) => {
                if (!newAggregatedResults[key][item]) {
                    newAggregatedResults[key][item] = data;
                }
            });
        });

        // Persist to sessionStorage
        sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(newAggregatedResults),
        );

        return newAggregatedResults;
    }, [initialResults, searchResults]);

    return aggregatedResults;
};
