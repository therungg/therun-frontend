'use server';

import type { LevelOverview } from '../../types/levels.types';
import { apiFetch } from './api-client';

export interface CreateLevelBody {
    name: string;
    rules?: string | null;
    sortOrder?: number;
}

export async function createLevel(
    sessionId: string,
    gameId: number,
    body: CreateLevelBody,
): Promise<{ id: number; created: number }> {
    return apiFetch<{ id: number; created: number }>(
        `/v1/games/${gameId}/groups`,
        {
            method: 'POST',
            sessionId,
            body: { ...body, kind: 'level' },
        },
    );
}

export interface UpdateLevelBody {
    name?: string;
    rules?: string | null;
}

export async function updateLevel(
    sessionId: string,
    gameId: number,
    groupId: number,
    body: UpdateLevelBody,
): Promise<void> {
    await apiFetch<unknown>(`/v1/games/${gameId}/groups/${groupId}`, {
        method: 'PUT',
        sessionId,
        body,
    });
}

export interface CreateLevelTemplateBody {
    display: string;
    primaryTiming?: string;
    gameTimeLabel?: string;
    rules?: string;
    requireVideo?: boolean;
    showMilliseconds?: boolean;
    isMain?: boolean;
}

export async function createLevelTemplate(
    sessionId: string,
    gameId: number,
    body: CreateLevelTemplateBody,
): Promise<{ id: number; created: number }> {
    return apiFetch<{ id: number; created: number }>(
        `/v1/games/${gameId}/categories`,
        {
            method: 'POST',
            sessionId,
            body: { ...body, isLevelTemplate: true },
        },
    );
}

export type LevelOp =
    | {
          op: 'level-exclusion';
          groupId: number;
          templateId: number;
          excluded: boolean;
      }
    | { op: 'level-detach'; categoryId: number }
    | { op: 'level-resync'; categoryId: number }
    | { op: 'level-push'; templateId: number }
    | { op: 'level-materialise' };

export async function levelOp(
    sessionId: string,
    gameId: number,
    op: LevelOp,
): Promise<unknown> {
    return apiFetch<unknown>(`/v1/games/${gameId}/categories`, {
        method: 'POST',
        sessionId,
        body: op,
    });
}

export async function fetchLevelOverview(
    sessionId: string,
    gameId: number,
): Promise<LevelOverview> {
    return apiFetch<LevelOverview>(`/v1/games/${gameId}/categories`, {
        method: 'POST',
        sessionId,
        body: { op: 'level-overview' },
    });
}
