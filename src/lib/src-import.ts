'use server';

// Board import from the source — thin apiFetch wrappers. Nothing here is
// cached: every call is authenticated and the job row changes while the
// worker runs; the pane polls `getSrcImportJob` itself.
import type {
    SrcImportCommitFlags,
    SrcImportJob,
    SrcImportJobKind,
} from '../../types/src-import.types';
import { apiFetch } from './api-client';

// Sibling RestApi at api.therun.gg/src-import/** (docs/frontend-guide-src-import.md).
const base = (gameId: number) => `/src-import/games/${gameId}`;

/** The two one-click kinds. 'settings' = configuration only; 'resync' = runs of therun runners. */
export type SrcResyncKind = Exclude<SrcImportJobKind, 'manual'>;

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
