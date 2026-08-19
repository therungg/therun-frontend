'use server';

// speedrun.com import (dry-run) — thin apiFetch wrappers. Nothing here is
// cached: every call is authenticated and the job row changes while the
// worker runs; the pane polls `getSrcImportJob` itself.
import type {
    Paged,
    SrcImportCategory,
    SrcImportJob,
    SrcImportLevel,
    SrcImportMatchKind,
    SrcImportPlayer,
    SrcImportRun,
    SrcImportVariable,
} from '../../types/src-import.types';
import { apiFetch } from './api-client';

// Sibling RestApi at api.therun.gg/src-import/** (docs/frontend-guide-src-import.md).
const base = (gameId: number) => `/src-import/games/${gameId}`;

export async function startSrcImport(
    sessionId: string,
    gameId: number,
    url: string,
): Promise<{ jobId: number }> {
    return apiFetch<{ jobId: number }>(base(gameId), {
        method: 'POST',
        sessionId,
        body: { url },
    });
}

export async function getSrcImportJob(
    sessionId: string,
    gameId: number,
): Promise<SrcImportJob | null> {
    const job = await apiFetch<SrcImportJob | null | undefined>(base(gameId), {
        method: 'GET',
        sessionId,
    });
    return job ?? null;
}

export async function listSrcImportCategories(
    sessionId: string,
    gameId: number,
    jobId: number,
): Promise<SrcImportCategory[]> {
    return apiFetch<SrcImportCategory[]>(
        `${base(gameId)}/${jobId}/categories`,
        {
            method: 'GET',
            sessionId,
        },
    );
}

export async function listSrcImportLevels(
    sessionId: string,
    gameId: number,
    jobId: number,
): Promise<SrcImportLevel[]> {
    return apiFetch<SrcImportLevel[]>(`${base(gameId)}/${jobId}/levels`, {
        method: 'GET',
        sessionId,
    });
}

export async function listSrcImportVariables(
    sessionId: string,
    gameId: number,
    jobId: number,
): Promise<SrcImportVariable[]> {
    return apiFetch<SrcImportVariable[]>(`${base(gameId)}/${jobId}/variables`, {
        method: 'GET',
        sessionId,
    });
}

export interface SrcImportPlayersQuery {
    match?: SrcImportMatchKind;
    page?: number;
    pageSize?: number;
}

export async function listSrcImportPlayers(
    sessionId: string,
    gameId: number,
    jobId: number,
    query: SrcImportPlayersQuery = {},
): Promise<Paged<SrcImportPlayer>> {
    return apiFetch<Paged<SrcImportPlayer>>(
        `${base(gameId)}/${jobId}/players${toQuery(query)}`,
        { method: 'GET', sessionId },
    );
}

export interface SrcImportRunsQuery {
    categoryId?: string;
    levelId?: string;
    status?: 'verified' | 'new';
    page?: number;
    pageSize?: number;
}

export async function listSrcImportRuns(
    sessionId: string,
    gameId: number,
    jobId: number,
    query: SrcImportRunsQuery = {},
): Promise<Paged<SrcImportRun>> {
    return apiFetch<Paged<SrcImportRun>>(
        `${base(gameId)}/${jobId}/runs${toQuery(query)}`,
        { method: 'GET', sessionId },
    );
}

function toQuery(q: object): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q) as Array<
        [string, string | number | undefined]
    >) {
        if (v !== undefined && v !== '') params.set(k, String(v));
    }
    const s = params.toString();
    return s ? `?${s}` : '';
}
