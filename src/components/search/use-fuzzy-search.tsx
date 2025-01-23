import Fuse, { FuseResultMatch } from "fuse.js";
import React from "react";
import { AggregatedResults } from "./use-aggregated-results";
import { RunData } from "./find-user-or-run";

export interface SearchItem {
    key: string;
    type: "user" | "game";
    data: RunData[];
    matches: FuseResultMatch[];
}

// TODO: Add categories and other types in the future
export const useFuseSearch = (aggregatedResults: AggregatedResults) => {
    const combinedResults = [
        ...Object.entries(aggregatedResults.users).map(([key, data]) => ({
            type: "user" as const,
            key,
            data,
        })),
        ...Object.entries(aggregatedResults.games).map(([key, data]) => ({
            type: "game" as const,
            key,
            data,
        })),
    ];

    return new Fuse(combinedResults, {
        keys: ["key", "game", "user"],
        includeScore: true,
        includeMatches: true,
        threshold: 0.45,
    });
};

export const useFilteredFuzzySearch = (
    fuse: Fuse<{
        type: "user" | "game";
        key: string;
        data: RunData[];
    }>,
    query: string,
) => {
    return React.useMemo(() => {
        if (!query) return [];
        const fuzzyResults = fuse.search(query);
        return fuzzyResults.reduce(
            (result, { item, matches }) => {
                if (!result[item.type]) result[item.type] = [];
                result[item.type].push({
                    ...item,
                    matches: (matches || []) as FuseResultMatch[],
                });
                return result;
            },
            {} as {
                [key: string]: SearchItem[];
            },
        );
    }, [query, fuse]);
};
