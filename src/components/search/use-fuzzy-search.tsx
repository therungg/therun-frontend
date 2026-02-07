import Fuse, { FuseResultMatch } from 'fuse.js';
import React from 'react';
import type { RunResult, UserResult } from './find-user-or-run';
import type { AggregatedResults } from './use-aggregated-results';

export type SearchItemKind = 'user' | 'run' | 'game';

export interface SearchItem {
    key: string;
    type: SearchItemKind;
    url?: string;
    userData?: UserResult;
    runs?: RunResult[];
    matches: FuseResultMatch[];
}

interface FuseSearchItem {
    type: SearchItemKind;
    key: string;
    userData?: UserResult;
    runs?: RunResult[];
}

export const useFuseSearch = (aggregatedResults: AggregatedResults) => {
    const combinedResults: FuseSearchItem[] = [
        ...Object.entries(aggregatedResults.users).map(([key, userData]) => ({
            type: 'user' as const,
            key,
            userData,
        })),
        ...Object.entries(aggregatedResults.games).map(([key, runs]) => ({
            type: 'game' as const,
            key,
            runs,
        })),
    ];

    return new Fuse(combinedResults, {
        keys: ['key'],
        includeScore: true,
        includeMatches: true,
        threshold: 0.45,
    });
};

export const useFilteredFuzzySearch = (
    fuse: Fuse<FuseSearchItem>,
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
