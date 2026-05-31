'use server';

import { getSession } from '~src/actions/session.action';
import {
    createCategoryReassignment,
    createGameReassignment,
    getCategoryReassignment,
    getGameReassignment,
    previewGameReassignment,
    undoCategoryReassignment,
    undoGameReassignment,
} from '~src/lib/reassignments';
import { defineAbilityFor } from '~src/rbac/ability';
import type {
    CategoryMappingEntry,
    CategoryReassignment,
    CategorySettingsDiffs,
    GameReassignment,
    PreviewResult,
} from '../../../../../../types/reassignments.types';

async function requireReassign() {
    const session = await getSession();
    if (!defineAbilityFor(session).can('reassign', 'reassignment')) {
        throw new Error('Forbidden: reassign permission required');
    }
    return session;
}

export async function previewGameAction(
    sourceGameId: number,
    targetGameId: number,
): Promise<PreviewResult> {
    const session = await requireReassign();
    return previewGameReassignment(sourceGameId, targetGameId, session.id);
}

export async function createGameAction(body: {
    sourceGameId: number;
    targetGameId: number;
    categoryMapping: CategoryMappingEntry[];
    settingsDiffsAcknowledged?: CategorySettingsDiffs[];
}): Promise<{ id: number; status: string }> {
    const session = await requireReassign();
    return createGameReassignment(body, session.id);
}

export async function createCategoryAction(body: {
    sourceCategoryId: number;
    targetCategoryId: number;
    settingsDiffsAcknowledged?: CategorySettingsDiffs[];
}): Promise<{ id: number; status: string }> {
    const session = await requireReassign();
    return createCategoryReassignment(body, session.id);
}

export async function getGameStatusAction(
    id: number,
): Promise<GameReassignment> {
    const session = await requireReassign();
    return getGameReassignment(id, session.id);
}

export async function getCategoryStatusAction(
    id: number,
): Promise<CategoryReassignment> {
    const session = await requireReassign();
    return getCategoryReassignment(id, session.id);
}

export async function undoGameAction(
    id: number,
): Promise<{ id: number; undone: true }> {
    const session = await requireReassign();
    return undoGameReassignment(id, session.id);
}

export async function undoCategoryAction(
    id: number,
): Promise<{ id: number; undone: true }> {
    const session = await requireReassign();
    return undoCategoryReassignment(id, session.id);
}
