// Mirror of the backend's account-merge contract — POST /admin/move-user with
// `mode: 'merge'`. Field names match the API exactly; keep in sync with
// `therun/src/username-change/merge-users.ts` (MergeResult) and
// `therun/src/api/admin/handler.ts` (handleMergeUsers).

/** Per-table move counts from a merge, plus runs that look like the same attempt on both sides. */
export interface MergeResult {
    perTable: Record<string, { moved: number; dropped: number }>;
    suspectedDuplicateRuns: Array<{
        gameId: number;
        categoryId: number | null;
        time: number;
        ids: number[];
    }>;
}

/** Which account survives and what it will be named once the merge runs. */
export interface MergePlan {
    survivingUserId: number;
    losingUserId: number;
    finalUsername: string;
}

/** Response body of a dry-run merge (`dryRun: true`). */
export interface MergePreviewResponse {
    preview: MergeResult;
    plan: MergePlan;
}

/** Response body of a real merge (`dryRun: false`). */
export interface MergeApplyResponse {
    merged: MergeResult;
    jobId: number;
}
