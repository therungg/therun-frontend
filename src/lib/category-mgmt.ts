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
    groups?: { id: number; name: string; categories?: GameCategoryRow[] }[];
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
