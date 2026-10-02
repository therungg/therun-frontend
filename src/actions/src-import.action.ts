'use server';

import type {
    SrcUserImportJob,
    SrcUserImportStart,
} from 'types/src-import.types';
import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';

// Success bodies are `{ result: T }`, errors are plain-text bodies surfaced
// via ApiError.message.
const ME_IMPORT = '/src-import/me/import';

export type SrcImportActionError = { error: string; status?: number };
export type StartResult = SrcUserImportStart | SrcImportActionError;
export type UndoResult = { jobId: number } | SrcImportActionError;
export type JobResult = { job: SrcUserImportJob | null } | SrcImportActionError;

function toError(e: unknown): SrcImportActionError {
    if (e instanceof ApiError) return { error: e.message, status: e.status };
    return { error: 'Something went wrong. Please try again.' };
}

/**
 * Start an import from a speedrun.com "export my data" JSON blob. `exportJson`
 * is the parsed object; the backend re-validates its shape (422 on failure).
 */
export async function startMyImportFromExport(
    exportJson: unknown,
): Promise<StartResult> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        return await apiFetch<SrcUserImportStart>(ME_IMPORT, {
            sessionId: session.id,
            method: 'POST',
            body: { export: exportJson },
        });
    } catch (e) {
        return toError(e);
    }
}

/**
 * A one-off upload URL for the original export file of the caller's import
 * `jobId`. The backend keeps the file 30 days; the URL is locked to `size`.
 */
export async function getExportFileUploadUrl(
    jobId: number,
    size: number,
): Promise<{ uploadUrl: string } | SrcImportActionError> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        return await apiFetch<{ uploadUrl: string }>(`${ME_IMPORT}/file`, {
            sessionId: session.id,
            method: 'POST',
            body: { jobId, size },
        });
    } catch (e) {
        return toError(e);
    }
}

/** The caller's single latest import job, or null if they've never imported. */
export async function getMyImportJob(): Promise<JobResult> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        const job = await apiFetch<SrcUserImportJob | null>(ME_IMPORT, {
            sessionId: session.id,
            method: 'GET',
        });
        return { job: job ?? null };
    } catch (e) {
        return toError(e);
    }
}

/** Undo the caller's latest import (removes the runs it created/last touched). */
export async function undoMyImport(): Promise<UndoResult> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        return await apiFetch<{ jobId: number }>(`${ME_IMPORT}/undo`, {
            sessionId: session.id,
            method: 'POST',
        });
    } catch (e) {
        return toError(e);
    }
}
