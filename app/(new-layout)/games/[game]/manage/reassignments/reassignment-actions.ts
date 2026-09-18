'use server';

import { getSession } from '~src/actions/session.action';
import {
    createCategoryReassignment,
    createGameReassignment,
    getCategoryReassignment,
    getGameReassignment,
    listMergeCategories,
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
    MergeCategoryOption,
    PreviewResult,
} from '../../../../../../types/reassignments.types';

/**
 * Game-level reassignment is site staff only, and the site-wide CASL grant is
 * the right gate for it.
 */
async function requireReassign() {
    const session = await getSession();
    if (!defineAbilityFor(session).can('reassign', 'reassignment')) {
        throw new Error('Forbidden: reassign permission required');
    }
    return session;
}

/**
 * Category merging is authorised per game, by the backend, against
 * `archive-category` on the game the source board belongs to. That scope is
 * not in the session's CASL ability, so checking the site grant here would
 * lock out exactly the game admins this is for. Carry the session through and
 * let the handler decide.
 */
async function requireSession() {
    return getSession();
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
    const session = await requireSession();
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
    const session = await requireSession();
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
    const session = await requireSession();
    return undoCategoryReassignment(id, session.id);
}

export async function listMergeCategoriesAction(
    gameId: number,
): Promise<MergeCategoryOption[]> {
    const session = await requireSession();
    return listMergeCategories(gameId, session.id);
}
