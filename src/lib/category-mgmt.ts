'use server';

import { apiFetch } from './api-client';

export type PrimaryTiming = 'realtime' | 'gametime';

export interface CategoryTimingSettings {
    id: number;
    display: string;
    primaryTiming: PrimaryTiming;
    hideRealTime: boolean;
    hideGameTime: boolean;
}

export interface CategoryVisibility {
    id: number;
    display: string;
    isMain: boolean;
    active: boolean;
}

export interface ManageCategoryRow {
    id: number;
    display: string;
    sortOrder: number;
    primaryTiming: PrimaryTiming;
    isMain: boolean;
    active: boolean;
    groupId: number | null;
    groupName: string | null;
    totalRunTime: number;
    totalFinishedAttemptCount: number;
    uniqueRunners: number;
}

interface GameCategoryRow {
    id: number;
    display: string;
    primaryTiming: PrimaryTiming;
    hideRealTime: boolean;
    hideGameTime: boolean;
    sortOrder?: number;
    isMain?: boolean;
    active?: boolean;
}

interface GamePageData {
    game?: { id: number };
    ungroupedCategories?: GameCategoryRow[];
    groups?: {
        id: number;
        name: string;
        sortOrder?: number;
        categories?: GameCategoryRow[];
    }[];
}

async function loadPageData(gameId: number): Promise<GamePageData> {
    const data = await apiFetch<GamePageData | undefined>(
        `/v1/games/${gameId}`,
    );
    return data ?? {};
}

export async function getCategoryTimingSettings(
    gameId: number,
    categoryId: number,
): Promise<CategoryTimingSettings | null> {
    const data = await loadPageData(gameId);
    const all: GameCategoryRow[] = [
        ...(data.ungroupedCategories ?? []),
        ...(data.groups ?? []).flatMap((g) => g.categories ?? []),
    ];
    const match = all.find((c) => c.id === categoryId);
    if (!match) return null;
    return {
        id: match.id,
        display: match.display,
        primaryTiming: match.primaryTiming,
        hideRealTime: match.hideRealTime,
        hideGameTime: match.hideGameTime,
    };
}

export async function getCategoryVisibility(
    gameId: number,
    categoryId: number,
): Promise<CategoryVisibility | null> {
    const data = await loadPageData(gameId);
    const all: GameCategoryRow[] = [
        ...(data.ungroupedCategories ?? []),
        ...(data.groups ?? []).flatMap((g) => g.categories ?? []),
    ];
    const match = all.find((c) => c.id === categoryId);
    if (!match) return null;
    return {
        id: match.id,
        display: match.display,
        isMain: match.isMain ?? false,
        active: match.active ?? true,
    };
}

export async function listManageCategories(
    gameId: number,
): Promise<ManageCategoryRow[]> {
    const data = await loadPageData(gameId);
    const rows: ManageCategoryRow[] = [];
    for (const c of data.ungroupedCategories ?? []) {
        rows.push({
            id: c.id,
            display: c.display,
            sortOrder: c.sortOrder ?? 0,
            primaryTiming: c.primaryTiming,
            isMain: c.isMain ?? false,
            active: c.active ?? true,
            groupId: null,
            groupName: null,
            totalRunTime: 0,
            totalFinishedAttemptCount: 0,
            uniqueRunners: 0,
        });
    }
    for (const g of data.groups ?? []) {
        for (const c of g.categories ?? []) {
            rows.push({
                id: c.id,
                display: c.display,
                sortOrder: c.sortOrder ?? 0,
                primaryTiming: c.primaryTiming,
                isMain: c.isMain ?? false,
                active: c.active ?? true,
                groupId: g.id,
                groupName: g.name,
                totalRunTime: 0,
                totalFinishedAttemptCount: 0,
                uniqueRunners: 0,
            });
        }
    }
    return rows;
}

export interface UpdateCategoryBody {
    primaryTiming?: PrimaryTiming;
    hideRealTime?: boolean;
    hideGameTime?: boolean;
    isMain?: boolean;
    active?: boolean;
    groupId?: number | null;
    rules?: string | null;
    sortAscending?: boolean;
    showMilliseconds?: boolean;
    requireVideo?: boolean;
    requireVideoTopN?: number | null;
    sortOrder?: number;
}

export async function updateCategory(
    sessionId: string,
    gameId: number,
    categoryId: number,
    body: UpdateCategoryBody,
): Promise<{ updated: boolean }> {
    return apiFetch<{ updated: boolean }>(
        `/v1/games/${gameId}/categories/${categoryId}`,
        {
            method: 'PUT',
            sessionId,
            body,
        },
    );
}

export interface ManageGroup {
    id: number;
    name: string;
    sortOrder: number;
}

export async function listManageGroups(gameId: number): Promise<ManageGroup[]> {
    const data = await loadPageData(gameId);
    return (data.groups ?? [])
        .map((g) => ({
            id: g.id,
            name: g.name,
            sortOrder: g.sortOrder ?? 0,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);
}

export interface CreateGroupBody {
    name: string;
    sortOrder?: number;
    hiddenByDefault?: boolean;
}

export interface UpdateGroupBody {
    name?: string;
    sortOrder?: number;
    hiddenByDefault?: boolean;
}

export async function createGroup(
    sessionId: string,
    gameId: number,
    body: CreateGroupBody,
): Promise<{ id: number }> {
    return apiFetch<{ id: number }>(`/v1/games/${gameId}/groups`, {
        method: 'POST',
        sessionId,
        body,
    });
}

export async function updateGroup(
    sessionId: string,
    gameId: number,
    groupId: number,
    body: UpdateGroupBody,
): Promise<{ updated: boolean }> {
    return apiFetch<{ updated: boolean }>(
        `/v1/games/${gameId}/groups/${groupId}`,
        { method: 'PUT', sessionId, body },
    );
}

export async function deleteGroup(
    sessionId: string,
    gameId: number,
    groupId: number,
): Promise<{ deleted: boolean }> {
    return apiFetch<{ deleted: boolean }>(
        `/v1/games/${gameId}/groups/${groupId}`,
        { method: 'DELETE', sessionId },
    );
}

export async function reorderGroups(
    sessionId: string,
    gameId: number,
    groupIds: number[],
): Promise<{ reordered: boolean }> {
    return apiFetch<{ reordered: boolean }>(
        `/v1/games/${gameId}/groups/reorder`,
        { method: 'PUT', sessionId, body: { groupIds } },
    );
}
