'use server';

// Board import from the source — thin apiFetch wrappers. Nothing here is
// cached: every call is authenticated and the job row changes while the
// worker runs; the pane polls `getSrcImportJob` itself.
import type {
    SrcGameCandidate,
    SrcImportCommitFlags,
    SrcImportJob,
    SrcImportJobKind,
    SrcPurgeJob,
    SrcPurgePreview,
} from '../../types/src-import.types';
import { apiFetch } from './api-client';

// Sibling RestApi at api.therun.gg/src-import/** (docs/frontend-guide-src-import.md).
const base = (gameId: number) => `/src-import/games/${gameId}`;

/** The two one-click kinds. 'settings' = configuration only; 'resync' = runs of therun runners. */
export type SrcResyncKind = Exclude<SrcImportJobKind, 'manual'>;

/**
 * Source games this board could be linked to, best first. Costs one source
 * API request server-side (the client spaces requests at 1/s), so call it
 * once when the link card mounts — never per keystroke.
 */
export async function listSrcGameCandidates(
    sessionId: string,
    gameId: number,
): Promise<SrcGameCandidate[]> {
    const res = await apiFetch<{ candidates: SrcGameCandidate[] }>(
        `${base(gameId)}/candidates`,
        { sessionId },
    );
    return res.candidates;
}

/**
 * First import of a game that has no source link yet. With `kind` the job
 * auto-applies like a resync (settings: configuration only), so the console
 * never needs the review flow.
 */
export async function startSrcImport(
    sessionId: string,
    gameId: number,
    url: string,
    kind?: SrcResyncKind,
): Promise<{ jobId: number }> {
    return apiFetch<{ jobId: number }>(base(gameId), {
        method: 'POST',
        sessionId,
        body: kind ? { url, kind } : { url },
    });
}

/**
 * One-click import that auto-applies with no review. No URL — the backend
 * derives it from the game's existing mappings. Throttled to once per day
 * per game per kind server-side; a 429 ApiError carries the next-available
 * time. `commitFlags` is merged over the previous job's flags and stored on
 * the new job.
 */
export async function startSrcResync(
    sessionId: string,
    gameId: number,
    kind: SrcResyncKind,
    commitFlags?: SrcImportCommitFlags,
): Promise<{ jobId: number }> {
    const body: { kind?: SrcResyncKind; commitFlags?: SrcImportCommitFlags } =
        {};
    if (kind === 'settings') body.kind = kind;
    if (commitFlags && Object.keys(commitFlags).length > 0) {
        body.commitFlags = commitFlags;
    }
    return apiFetch<{ jobId: number }>(`${base(gameId)}/resync`, {
        method: 'POST',
        sessionId,
        ...(Object.keys(body).length > 0 ? { body } : {}),
    });
}

/** Latest job — of one kind when `kind` is given, otherwise of any kind. */
export async function getSrcImportJob(
    sessionId: string,
    gameId: number,
    kind?: SrcImportJobKind,
): Promise<SrcImportJob | null> {
    const path = kind ? `${base(gameId)}?kind=${kind}` : base(gameId);
    const job = await apiFetch<SrcImportJob | null | undefined>(path, {
        method: 'GET',
        sessionId,
    });
    return job ?? null;
}

// ---------------------------------------------------------------------------
// Removing a board's speedrun.com data — site-admin only, all four routes.
// docs/frontend-guide-src-import.md "Removing a board's speedrun.com data".
// ---------------------------------------------------------------------------

/** Counting-only preview of what a purge would remove. No writes. */
export async function getSrcPurgePreview(
    sessionId: string,
    gameId: number,
): Promise<SrcPurgePreview> {
    return apiFetch<SrcPurgePreview>(`${base(gameId)}/purge/preview`, {
        sessionId,
    });
}

/** The game's purge job, for polling. Null when none has ever run. */
export async function getSrcPurgeJob(
    sessionId: string,
    gameId: number,
): Promise<SrcPurgeJob | null> {
    const job = await apiFetch<SrcPurgeJob | null | undefined>(
        `${base(gameId)}/purge`,
        { method: 'GET', sessionId },
    );
    return job ?? null;
}

/**
 * Starts the purge. `confirmName` must match the game's display name exactly
 * (after trimming) — the backend's second pair of hands.
 */
export async function startSrcPurge(
    sessionId: string,
    gameId: number,
    confirmName: string,
): Promise<{ purgeJobId: number }> {
    return apiFetch<{ purgeJobId: number }>(`${base(gameId)}/purge`, {
        method: 'POST',
        sessionId,
        body: { confirmName },
    });
}

/** Lifts the post-purge tombstone so the board can be imported again. */
export async function unblockSrcPurge(
    sessionId: string,
    gameId: number,
): Promise<{ unblocked: boolean }> {
    return apiFetch<{ unblocked: boolean }>(`${base(gameId)}/purge/unblock`, {
        method: 'POST',
        sessionId,
    });
}
