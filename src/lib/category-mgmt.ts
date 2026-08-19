'use server';

import type { CategoryDisplayMode } from '../../types/leaderboards.types';
import type { LevelTemplate } from '../../types/levels.types';
import { apiFetch } from './api-client';

export type PrimaryTiming = 'realtime' | 'gametime';

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
    levelTemplateId: number | null;
    levelOverride: boolean;
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
    levelTemplateId?: number | null;
    levelOverride?: boolean;
    name?: string;
    rules?: string | null;
    imageUrl?: string | null;
    gameTimeLabel?: string;
    sortAscending?: boolean;
    showMilliseconds?: boolean;
    requireVideo?: boolean;
}

interface GamePageData {
    game?: { id: number; categoryDisplayMode?: string | null };
    ungroupedCategories?: GameCategoryRow[];
    groups?: {
        id: number;
        name: string;
        sortOrder?: number;
        hiddenByDefault?: boolean;
        displayMode?: string | null;
        kind?: string;
        rules?: string | null;
        categories?: GameCategoryRow[];
    }[];
    levelTemplates?: GameCategoryRow[];
}

/** Anything the UI cannot draw reads as "no override stated". */
function asDisplayMode(
    value: string | null | undefined,
): CategoryDisplayMode | null {
    return value === 'auto' || value === 'pills' || value === 'dropdown'
        ? value
        : null;
}

async function loadPageData(gameId: number): Promise<GamePageData> {
    const data = await apiFetch<GamePageData | undefined>(
        `/v1/games/${gameId}`,
    );
    return data ?? {};
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
            levelTemplateId: c.levelTemplateId ?? null,
            levelOverride: c.levelOverride ?? false,
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
                levelTemplateId: c.levelTemplateId ?? null,
                levelOverride: c.levelOverride ?? false,
            });
        }
    }
    return rows;
}

export async function listLevelTemplates(
    gameId: number,
): Promise<LevelTemplate[]> {
    const data = await loadPageData(gameId);
    return (data.levelTemplates ?? []).map((t) => ({
        id: t.id,
        display: t.display,
        rules: t.rules ?? null,
        isMain: t.isMain ?? false,
        sortOrder: t.sortOrder ?? 0,
        imageUrl: t.imageUrl ?? null,
        primaryTiming: t.primaryTiming === 'gametime' ? 'gt' : 'rt',
        gameTimeLabel: t.gameTimeLabel === 'lrt' ? 'lrt' : 'igt',
        sortAscending: t.sortAscending ?? true,
        showMilliseconds: t.showMilliseconds ?? true,
        requireVideo: t.requireVideo ?? false,
    }));
}

export interface UpdateCategoryBody {
    primaryTiming?: PrimaryTiming;
    /** What the board calls its game-time clock. Display only — 'lrt' boards
     * store primaryTiming 'gametime' and rank identically. */
    gameTimeLabel?: 'igt' | 'lrt';
    hideRealTime?: boolean;
    hideGameTime?: boolean;
    /** Rank RTA-only runs on the game-time board by their real time. Backend
     * rejects true when the category's own hideGameTime flag is set. */
    rtaFallback?: boolean;
    isMain?: boolean;
    active?: boolean;
    groupId?: number | null;
    rules?: string | null;
    sortAscending?: boolean;
    showMilliseconds?: boolean;
    requireVideo?: boolean;
    requireVideoTopN?: number | null;
    sortOrder?: number;
    imageUrl?: string | null;
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

/**
 * The field set the setup matrix can stamp across a selection. Narrower than
 * UpdateCategoryBody on purpose, mirroring the backend: identity and structure
 * (display, groupId, sortOrder, isMain, active) each carry a per-category
 * invariant that is meaningless applied identically to many categories.
 */
export interface BulkCategoryFields {
    primaryTiming?: 'realtime' | 'gametime';
    /** What the board calls its game-time clock ('igt' | 'lrt'). Display only. */
    gameTimeLabel?: 'igt' | 'lrt';
    hideRealTime?: boolean;
    hideGameTime?: boolean;
    /** Rank RTA-only runs on the game-time board by their real time. Backend
     * rejects true for any selected category whose own hideGameTime is set. */
    rtaFallback?: boolean;
    rules?: string | null;
    sortAscending?: boolean;
    showMilliseconds?: boolean;
}

/**
 * One transaction backend-side: either every selected category takes the
 * values or none does, and the board's page data rebuilds once rather than
 * once per category.
 *
 * Rides POST /categories with an explicit `op` rather than a `/bulk` route of
 * its own — the backend's `api` CloudFormation template is at 499 of its hard
 * 500-resource limit, so a dedicated route could not be registered. See the
 * note in aws/lib/api-stack.ts.
 */
export async function bulkUpdateCategories(
    sessionId: string,
    gameId: number,
    categoryIds: number[],
    fields: BulkCategoryFields,
): Promise<{ updated: number }> {
    return apiFetch<{ updated: number }>(`/v1/games/${gameId}/categories`, {
        method: 'POST',
        sessionId,
        body: { op: 'bulk-update', categoryIds, fields },
    });
}

export interface ManageGroup {
    id: number;
    name: string;
    sortOrder: number;
    hiddenByDefault: boolean;
    /** `null` = no override; the group follows `gameCategoryDisplayMode`. */
    displayMode: CategoryDisplayMode | null;
    /** category_groups.kind — 'level' groups are individual levels. */
    kind: 'normal' | 'level';
    /** Level-specific rules (level groups only). */
    rules: string | null;
}

export async function listManageGroups(gameId: number): Promise<ManageGroup[]> {
    const data = await loadPageData(gameId);
    return (data.groups ?? [])
        .map((g) => ({
            id: g.id,
            name: g.name,
            sortOrder: g.sortOrder ?? 0,
            hiddenByDefault: g.hiddenByDefault ?? false,
            displayMode: asDisplayMode(g.displayMode),
            kind: g.kind === 'level' ? ('level' as const) : ('normal' as const),
            rules: g.rules ?? null,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);
}

export interface CreateGroupBody {
    name: string;
    sortOrder?: number;
    hiddenByDefault?: boolean;
    displayMode?: CategoryDisplayMode | null;
    kind?: 'normal' | 'level';
    rules?: string | null;
}

export interface UpdateGroupBody {
    name?: string;
    sortOrder?: number;
    hiddenByDefault?: boolean;
    /** `null` clears the override and returns the group to the game default. */
    displayMode?: CategoryDisplayMode | null;
    rules?: string | null;
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
