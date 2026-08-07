'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { apiFetch } from './api-client';
import { v1Fetch } from './v1-fetch';

export interface TopRunnerRow {
    username: string;
    /** Total playtime in this game, ms. The ranking metric. */
    playtime: number;
    attempts: number;
    pbs: number;
}

/** `/v1/runs` + `/v1/finished-runs` aggregate-mode row. */
interface AggregateRow {
    username: string;
    // SQL sum()/count() serialize as strings through the JSON layer.
    value: number | string;
}

/** `/games/activity?type=players` row (bigint sums arrive as strings). */
interface PlayerActivityRow {
    userId: number | null;
    username: string;
    totalPlaytime: number | string;
    totalAttempts: number | string;
    totalFinishedAttempts: number | string;
    totalPbs: number | string;
    totalPbsWithPrevious: number | string;
}

function toRowMap(rows: AggregateRow[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const r of rows) {
        if (typeof r.username === 'string') {
            map.set(r.username, Number(r.value) || 0);
        }
    }
    return map;
}

/**
 * All-time top runners of a game, ranked by playtime. Three aggregate calls
 * (playtime, attempts, PB count) merged by username — the aggregate endpoint
 * carries exactly one metric per call. Usernames arrive pre-masked by the
 * backend's anonymize resolver, so no redaction handling here.
 */
export async function getTopRunnersAllTime(
    gameId: number,
    limit = 10,
): Promise<TopRunnerRow[]> {
    'use cache';
    cacheLife('hours');
    cacheTag(`game-top-runners:${gameId}`);

    const base = `/v1/runs?game_id=${gameId}&aggregate=sum&group_by=username&limit=100`;
    const [playtime, attempts, pbs] = await Promise.all([
        v1Fetch<{ result: AggregateRow[] }>(
            `${base}&aggregate_column=total_run_time`,
        ),
        v1Fetch<{ result: AggregateRow[] }>(
            `${base}&aggregate_column=attempt_count`,
        ),
        // PB count comes from finished_runs — speedrun_runs has no PB tally.
        v1Fetch<{ result: AggregateRow[] }>(
            `/v1/finished-runs?game_id=${gameId}&is_pb=true&aggregate=count&group_by=username&limit=100`,
        ),
    ]);

    const attemptsBy = toRowMap(attempts.result ?? []);
    const pbsBy = toRowMap(pbs.result ?? []);
    // The playtime call's order IS the ranking; the other two only enrich.
    return (playtime.result ?? []).slice(0, limit).map((r) => ({
        username: r.username,
        playtime: Number(r.value) || 0,
        attempts: attemptsBy.get(r.username) ?? 0,
        pbs: pbsBy.get(r.username) ?? 0,
    }));
}

/**
 * Most active runners in a date window (YYYY-MM-DD, inclusive), ranked by
 * playtime — `activity_daily` via `/games/activity?type=players`, which
 * carries every metric in one call.
 */
export async function getTopRunnersForPeriod(
    gameId: number,
    from: string,
    to: string,
    limit = 10,
): Promise<TopRunnerRow[]> {
    'use cache';
    cacheLife('hours');
    cacheTag(`game-top-runners:${gameId}`);

    const rows = await apiFetch<PlayerActivityRow[]>(
        `/games/activity?type=players&gameId=${gameId}&from=${from}&to=${to}&limit=${limit}`,
    );
    return (rows ?? []).map((r) => ({
        username: r.username,
        playtime: Number(r.totalPlaytime) || 0,
        attempts: Number(r.totalAttempts) || 0,
        pbs: Number(r.totalPbs) || 0,
    }));
}
