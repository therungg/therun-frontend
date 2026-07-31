// `/v1/runs/categories` answers in snake_case (unlike `/v1/runs/games`,
// which is camelCase) — see handleCategories in the backend's query-runs.ts.
// Fetchers pull the wire row and map it here; consumers only ever see the
// camelCase CategoryStats. Plain module (not 'use server') so the sync
// mapper can be shared.

export interface CategoryStats {
    gameId: number;
    categoryId: number;
    gameDisplay: string;
    categoryDisplay: string;
    gameImage: string | null;
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    totalPbs: number;
    uniqueRunners: number;
}

export interface CategoryStatsRow {
    game_id: number;
    category_id: number;
    game_display: string;
    category_display: string;
    game_image: string | null;
    total_run_time: number;
    total_attempt_count: number;
    total_finished_attempt_count: number;
    total_pbs: number;
    unique_runners: number;
}

export function mapCategoryStatsRow(row: CategoryStatsRow): CategoryStats {
    return {
        gameId: row.game_id,
        categoryId: row.category_id,
        gameDisplay: row.game_display,
        categoryDisplay: row.category_display,
        gameImage: row.game_image,
        totalRunTime: row.total_run_time,
        totalAttemptCount: row.total_attempt_count,
        totalFinishedAttemptCount: row.total_finished_attempt_count,
        totalPbs: row.total_pbs,
        uniqueRunners: row.unique_runners,
    };
}
