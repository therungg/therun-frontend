'use server';

import type {
    SrcUserImportJob,
    SrcUserSyncStatus,
} from 'types/src-import.types';
import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';

// The src-import routes live on a sibling RestApi mapped at
// `${NEXT_PUBLIC_DATA_URL}/src-import/**` (the main API template is at the
// CloudFormation 500-resource cap). Plain apiFetch — success bodies are
// `{ result: T }`, errors are plain-text bodies surfaced via ApiError.message.
const ME_IMPORT = '/src-import/me/import';

export type SrcImportActionError = { error: string; status?: number };
export type StartResult = { jobId: number } | SrcImportActionError;
export type JobResult = { job: SrcUserImportJob | null } | SrcImportActionError;

function toError(e: unknown): SrcImportActionError {
    if (e instanceof ApiError) return { error: e.message, status: e.status };
    return { error: 'Something went wrong. Please try again.' };
}

/** Start an import of the caller's own SRC history by SRC username. */
export async function startMyImport(srcUsername: string): Promise<StartResult> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        return await apiFetch<{ jobId: number }>(ME_IMPORT, {
            sessionId: session.id,
            method: 'POST',
            body: { srcUsername },
        });
    } catch (e) {
        return toError(e);
    }
}

/**
 * Start an import from a raw speedrun.com "export my data" JSON blob. `exportJson`
 * is the parsed object; the backend re-validates its shape (422 on failure).
 */
export async function startMyImportFromExport(
    exportJson: unknown,
): Promise<StartResult> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        return await apiFetch<{ jobId: number }>(ME_IMPORT, {
            sessionId: session.id,
            method: 'POST',
            body: { export: exportJson },
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
export async function undoMyImport(): Promise<StartResult> {
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

const ME_SYNC = '/src-import/me/sync';
export type SyncStatusResult =
    | { status: SrcUserSyncStatus }
    | SrcImportActionError;

/** Automatic-sync status for the caller: opt-out flag, linked identity, last job. */
export async function getMySyncStatus(): Promise<SyncStatusResult> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        const status = await apiFetch<SrcUserSyncStatus>(ME_SYNC, {
            sessionId: session.id,
            method: 'GET',
        });
        return { status };
    } catch (e) {
        return toError(e);
    }
}

/** Toggle the automatic sync of the caller's speedrun.com runs. */
export async function setMySyncOptOut(
    optOut: boolean,
): Promise<SyncStatusResult> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        const status = await apiFetch<SrcUserSyncStatus>(ME_SYNC, {
            sessionId: session.id,
            method: 'PATCH',
            body: { optOut },
        });
        return { status };
    } catch (e) {
        return toError(e);
    }
}
