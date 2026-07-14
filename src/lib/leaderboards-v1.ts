'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type {
    LeaderboardResponse,
    ManualTimeDetail,
    RunDetail,
    UserRanking,
    ValidCombinations,
    VariableDef,
    VariablesResponse,
    WrHistoryEntry,
} from '../../types/leaderboards.types';
import { V1FetchError, v1Fetch } from './v1-fetch';

export interface LeaderboardQuery {
    gameSlug: string;
    categorySlug: string;
    timing: 'rt' | 'gt';
    /**
     * Plain-text canonical values keyed by `nameNormalized` for each
     * subcategory variable. Omitted entries fall back to that variable's
     * `defaultValueIndex` bucket on the server.
     */
    subcategoryValues?: Record<string, string>;
    /** When true, returns the combined-across-subcategories view (`?combined=1`). */
    combined?: boolean;
    /** Filter variables, keyed by `nameNormalized` (no `var_` prefix). */
    varFilters?: Record<string, string>;
    verified?: boolean;
    page?: number;
    pageSize?: number;
}

function canonicalSubcategoryFragment(
    values: Record<string, string> | undefined,
    combined: boolean | undefined,
): string {
    if (combined) return 'combined';
    if (!values) return '';
    const keys = Object.keys(values).sort();
    return keys.map((k) => `${k}=${values[k]}`).join('|');
}

function buildLeaderboardQS(q: LeaderboardQuery): string {
    const sp = new URLSearchParams();
    sp.set('timing', q.timing);
    if (q.combined) sp.set('combined', '1');
    if (q.subcategoryValues && !q.combined) {
        for (const [k, v] of Object.entries(q.subcategoryValues)) {
            if (v.length > 0) sp.set(k, v);
        }
    }
    if (q.varFilters) {
        for (const [k, v] of Object.entries(q.varFilters)) {
            if (v.length > 0) sp.set(k, v);
        }
    }
    if (q.verified) sp.set('verified', 'true');
    if (q.page) sp.set('page', String(q.page));
    if (q.pageSize) sp.set('pageSize', String(q.pageSize));
    return sp.toString();
}

export interface LeaderboardResultOk {
    ok: true;
    result: LeaderboardResponse;
}
export interface LeaderboardResultInvalidCombination {
    ok: false;
    reason: 'invalid_combination';
    validCombinations: string[];
}

export async function getLeaderboard(
    q: LeaderboardQuery,
): Promise<LeaderboardResultOk | LeaderboardResultInvalidCombination> {
    'use cache';
    cacheLife('minutes');
    cacheTag(
        `lb:${q.gameSlug}:${q.categorySlug}:${canonicalSubcategoryFragment(q.subcategoryValues, q.combined)}:${q.timing}:${q.verified ? 'v' : 'a'}`,
    );

    const game = encodeURIComponent(q.gameSlug);
    const category = encodeURIComponent(q.categorySlug);
    const path = `/v1/leaderboards/${game}/${category}?${buildLeaderboardQS(q)}`;

    try {
        const raw = await v1Fetch<{
            items: LeaderboardResponse['entries'];
            totalItems: number;
            page: number;
            pageSize: number;
            totalPages: number;
            hideRealTime?: boolean;
            hideGameTime?: boolean;
        }>(path);
        return {
            ok: true,
            result: {
                entries: raw.items ?? [],
                page: raw.page,
                pageSize: raw.pageSize,
                totalItems: raw.totalItems,
                totalPages: raw.totalPages,
                hideRealTime: raw.hideRealTime ?? false,
                hideGameTime: raw.hideGameTime ?? false,
            },
        };
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) {
            const body = e.body as
                | { error?: string; validCombinations?: string[] }
                | undefined;
            if (
                body &&
                body.error === 'leaderboard does not exist' &&
                Array.isArray(body.validCombinations)
            ) {
                return {
                    ok: false,
                    reason: 'invalid_combination',
                    validCombinations: body.validCombinations,
                };
            }
        }
        throw e;
    }
}

export async function getVariables(
    gameSlug: string,
    categorySlug: string,
): Promise<{
    variables: VariableDef[];
    reservedParams: string[];
    validCombinations: ValidCombinations;
}> {
    'use cache';
    cacheLife('hours');
    cacheTag(`game-vars:${gameSlug}:${categorySlug}`);

    const path = `/v1/leaderboards/${encodeURIComponent(gameSlug)}/${encodeURIComponent(categorySlug)}/variables`;
    const body = await v1Fetch<VariablesResponse>(path);
    return {
        // Enrich each row with a derived `scope` for UI labeling. Backend
        // returns plain VariableRow shape per the contract.
        variables: (body.variables ?? []).map((v) => ({
            ...v,
            scope:
                v.categoryId == null
                    ? ('game' as const)
                    : ('category' as const),
        })),
        reservedParams: body.reservedParams ?? [],
        validCombinations: body.validCombinations ?? { mode: 'open' },
    };
}

export async function getWrHistory(
    gameSlug: string,
    categorySlug: string,
    subcategoryKey = '',
): Promise<WrHistoryEntry[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`wr-history:${gameSlug}:${categorySlug}:${subcategoryKey}`);

    // Wire param is still named `subcategory` (kept for back-compat). The
    // value is the plain-text key now, not a hash.
    const path = `/v1/leaderboards/wr-history/${encodeURIComponent(gameSlug)}/${encodeURIComponent(categorySlug)}?subcategory=${encodeURIComponent(subcategoryKey)}`;
    const body = await v1Fetch<{ result: WrHistoryEntry[] }>(path);
    return body.result ?? [];
}

export async function getUserRankings(userId: number): Promise<UserRanking[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`user-rankings:id:${userId}`);

    const path = `/v1/leaderboards/user/${userId}/rankings`;
    const body = await v1Fetch<{ result: UserRanking[] }>(path);
    return body.result ?? [];
}

export async function getRunById(runId: number): Promise<RunDetail | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`run:${runId}`);

    try {
        const body = await v1Fetch<{ result: RunDetail }>(
            `/v1/leaderboards/runs/${runId}`,
        );
        return body.result;
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) return null;
        throw e;
    }
}

export async function getUserRankingsByName(
    username: string,
): Promise<UserRanking[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`user-rankings:name:${username.toLowerCase()}`);

    try {
        const path = `/v1/leaderboards/user/by-name/${encodeURIComponent(username)}/rankings`;
        const body = await v1Fetch<{ result: UserRanking[] }>(path);
        return body.result ?? [];
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) return [];
        throw e;
    }
}

export async function getManualTimeById(
    id: number,
): Promise<ManualTimeDetail | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`manual-time:${id}`);

    try {
        const body = await v1Fetch<{ result: ManualTimeDetail }>(
            `/v1/leaderboards/manual-times/${id}`,
        );
        return body.result;
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) return null;
        throw e;
    }
}
