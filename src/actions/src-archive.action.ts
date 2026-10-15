'use server';

import type {
    SrcArchiveBaseline,
    SrcArchiveGameJob,
    SrcArchivePlan,
    SrcArchiveSkips,
} from 'types/src-import.types';
import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';

const base = (gameId: number) => `/src-import/archive/games/${gameId}`;

type ActionError = { error: string };

function toError(e: unknown): ActionError {
    if (e instanceof ApiError) return { error: e.message };
    return { error: 'Something went wrong. Please try again.' };
}

export async function getGameArchive(
    gameId: number,
): Promise<{ job: SrcArchiveGameJob | null } | ActionError> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        const job = await apiFetch<SrcArchiveGameJob | null>(base(gameId), {
            sessionId: session.id,
        });
        return { job: job ?? null };
    } catch (e) {
        return toError(e);
    }
}

export async function getArchivePlan(
    gameId: number,
): Promise<{ plan: SrcArchivePlan | null } | ActionError> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        const plan = await apiFetch<SrcArchivePlan | null>(
            `${base(gameId)}/plan`,
            { sessionId: session.id },
        );
        return { plan: plan ?? null };
    } catch (e) {
        return toError(e);
    }
}

export async function setArchiveSkips(
    gameId: number,
    skip: SrcArchiveSkips,
): Promise<{ plan: SrcArchivePlan | null } | ActionError> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        const plan = await apiFetch<SrcArchivePlan | null>(
            `${base(gameId)}/plan`,
            { sessionId: session.id, method: 'PUT', body: { skip } },
        );
        return { plan: plan ?? null };
    } catch (e) {
        return toError(e);
    }
}

export async function applyGameArchive(
    gameId: number,
    choice: { structure: boolean },
): Promise<{ ok: true } | ActionError> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        await apiFetch(`${base(gameId)}/apply`, {
            sessionId: session.id,
            method: 'POST',
            body: choice,
        });
        return { ok: true };
    } catch (e) {
        return toError(e);
    }
}

export async function getArchiveBaseline(
    gameId: number,
): Promise<{ baseline: SrcArchiveBaseline } | ActionError> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        const baseline = await apiFetch<SrcArchiveBaseline>(
            `${base(gameId)}/baseline`,
            { sessionId: session.id },
        );
        return { baseline };
    } catch (e) {
        return toError(e);
    }
}

export async function applyArchiveBaseline(
    gameId: number,
): Promise<{ baseline: SrcArchiveBaseline } | ActionError> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        const baseline = await apiFetch<SrcArchiveBaseline>(
            `${base(gameId)}/baseline`,
            { sessionId: session.id, method: 'POST' },
        );
        return { baseline };
    } catch (e) {
        return toError(e);
    }
}

export async function undoArchiveBaseline(
    gameId: number,
    baselineId: number,
): Promise<{ baseline: SrcArchiveBaseline } | ActionError> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        const baseline = await apiFetch<SrcArchiveBaseline>(
            `${base(gameId)}/baseline/${baselineId}/undo`,
            { sessionId: session.id, method: 'POST' },
        );
        return { baseline };
    } catch (e) {
        return toError(e);
    }
}
