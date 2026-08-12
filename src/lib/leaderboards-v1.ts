'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type {
    LeaderboardExportResponse,
    LeaderboardResponse,
    ManualTimeDetail,
    RunDetail,
    RunnerEntriesResult,
    RunnerGameEntry,
    UserRanking,
    ValidCombinations,
    VariableRow,
    VariablesResponse,
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
    // Two tags: the exact slice, plus a coarse per-category tag. The slice
    // fragment is URL-derived (defaulted subcategory values omitted), while
    // writers only know a run's stored subcategoryKey (defaults materialized)
    // — so a write can't enumerate every fragment a view may be cached under.
    // Writers bust the coarse tag for read-your-writes across all of a
    // category's views (default selection, partial selections, combined).
    cacheTag(
        `lb:${q.gameSlug}:${q.categorySlug}:${canonicalSubcategoryFragment(q.subcategoryValues, q.combined)}:${q.timing}:${q.verified ? 'v' : 'a'}`,
        `lb:${q.gameSlug}:${q.categorySlug}`,
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

/**
 * "Find me": one request that returns the page containing the runner's row
 * (findRunnerFound: true) or, when the runner isn't visible on this board,
 * the requested page with findRunnerFound: false. Deliberately UNCACHED —
 * the result varies per runner and a find is a one-shot jump, so caching it
 * would only fragment the board cache.
 */
export async function findRunnerOnBoard(
    q: LeaderboardQuery,
    runnerName: string,
): Promise<LeaderboardResponse | null> {
    const game = encodeURIComponent(q.gameSlug);
    const category = encodeURIComponent(q.categorySlug);
    const qs = buildLeaderboardQS(q);
    const path =
        `/v1/leaderboards/${game}/${category}?${qs}` +
        `${qs ? '&' : ''}findRunner=${encodeURIComponent(runnerName)}`;
    try {
        const raw = await v1Fetch<{
            items: LeaderboardResponse['entries'];
            totalItems: number;
            page: number;
            pageSize: number;
            totalPages: number;
            hideRealTime?: boolean;
            hideGameTime?: boolean;
            findRunnerFound?: boolean;
        }>(path);
        return {
            entries: raw.items ?? [],
            page: raw.page,
            pageSize: raw.pageSize,
            totalItems: raw.totalItems,
            totalPages: raw.totalPages,
            hideRealTime: raw.hideRealTime ?? false,
            hideGameTime: raw.hideGameTime ?? false,
            findRunnerFound: raw.findRunnerFound ?? false,
        };
    } catch {
        return null;
    }
}

/**
 * Full-board export: unpaginated, with the per-run enrichment fields the
 * paginated endpoint omits. Deliberately uncached — an export should reflect
 * the board as it is right now. Rides the `/mod` base-path mapping like
 * getUserRankingsByName (the main gateway is at its 500-resource cap, so
 * the export route only exists via the proxy API).
 */
export async function getLeaderboardExport(
    q: Omit<LeaderboardQuery, 'page' | 'pageSize'>,
): Promise<LeaderboardExportResponse | null> {
    const game = encodeURIComponent(q.gameSlug);
    const category = encodeURIComponent(q.categorySlug);
    const path = `/mod/v1/leaderboards/${game}/${category}/export?${buildLeaderboardQS(q)}`;
    try {
        return await v1Fetch<LeaderboardExportResponse>(path);
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) return null;
        throw e;
    }
}

export async function getVariables(
    gameSlug: string,
    categorySlug: string,
): Promise<{
    variables: VariableRow[];
    reservedParams: string[];
    validCombinations: ValidCombinations;
}> {
    'use cache';
    cacheLife('hours');
    cacheTag(`game-vars:${gameSlug}:${categorySlug}`);

    const path = `/v1/leaderboards/${encodeURIComponent(gameSlug)}/${encodeURIComponent(categorySlug)}/variables`;
    const body = await v1Fetch<VariablesResponse>(path);
    return {
        variables: body.variables ?? [],
        reservedParams: body.reservedParams ?? [],
        validCombinations: body.validCombinations ?? { mode: 'open' },
    };
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
        // Rides the `/mod` base-path mapping: the main gateway is at its
        // 500-resource cap, so this route was never registered there and every
        // profile view 403'd into the catch below — rankings silently absent
        // for everyone. `/mod` is proxy:true and strips the prefix, so the
        // Lambda still sees /v1/leaderboards/...
        const path = `/mod/v1/leaderboards/user/by-name/${encodeURIComponent(username)}/rankings`;
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

// Not exported: this file is 'use server', where every export has to be an
// async function. Nothing outside busts this tag yet — see the design doc's
// cache-invalidation note.
const runnerEntriesCacheTag = (gameId: number, runner: string) =>
    `runner-entries:${gameId}:${runner.toLowerCase()}`;

/**
 * Every board entry a runner already holds in one game, by account name or by
 * a bare name.
 *
 * `getUserRankingsByName` cannot stand in for this: it reads `finished_runs`
 * only, and every time the submit dialog creates lands in `manual_times` —
 * a separate table merged into boards at read time. It also has no concept of
 * a runner without an account.
 *
 * Rides the `/mod` base-path mapping for the same reason
 * `getUserRankingsByName` does: the main gateway is at its resource cap, so
 * the route exists only through the proxy API, which strips the prefix.
 */
export async function getRunnerGameEntries(
    gameId: number,
    ref: { username: string } | { guestName: string },
): Promise<RunnerEntriesResult> {
    'use cache';
    cacheLife('minutes');
    const runner = 'username' in ref ? ref.username : ref.guestName;
    cacheTag(runnerEntriesCacheTag(gameId, runner));

    const qs =
        'username' in ref
            ? `username=${encodeURIComponent(ref.username)}`
            : `guestName=${encodeURIComponent(ref.guestName)}`;

    try {
        const body = await v1Fetch<{
            result: { userId: number | null; entries: RunnerGameEntry[] };
        }>(`/mod/v1/leaderboards/games/${gameId}/runner-entries?${qs}`);
        return {
            status: 'found',
            userId: body.result.userId,
            entries: body.result.entries ?? [],
        };
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) {
            return { status: 'no-account' };
        }
        throw e;
    }
}
