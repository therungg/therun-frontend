'use server';

import type { SrcUserImportJob } from 'types/src-import.types';
import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';

// Success bodies are `{ result: T }`, errors are plain-text bodies surfaced
// via ApiError.message.
const ME_IMPORT = '/src-import/me/import';

export type SrcImportActionError = { error: string; status?: number };
export type UndoResult = { jobId: number } | SrcImportActionError;
export type JobResult = { job: SrcUserImportJob | null } | SrcImportActionError;

function toError(e: unknown): SrcImportActionError {
    if (e instanceof ApiError) return { error: e.message, status: e.status };
    return { error: 'Something went wrong. Please try again.' };
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
