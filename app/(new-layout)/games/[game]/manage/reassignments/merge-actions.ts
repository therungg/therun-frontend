'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    listCategoryExtensions,
    listMergeCategories,
    mergeCategories,
    mergeCategoryExtensions,
    requestGameMerge,
} from '~src/lib/reassignments';
import type {
    CategoryExtensionOptions,
    CategoryMergeResult,
    GameMergeRequestResult,
    MergeCategoryPayload,
} from '../../../../../../types/reassignments.types';

/**
 * No ability check here, unlike `reassignment-actions.ts`.
 *
 * That file gates on `reassign`, a site-wide grant, because merging whole
 * games across the site is a site-wide job. Merging two boards on one game is
 * not: the backend authorises it per game against `merge-category`, which any
 * moderator of that game holds. Repeating a site check here would hide the
 * tab from exactly the people it is for.
 */
export async function listMergeCategoriesAction(
    gameId: number,
): Promise<MergeCategoryPayload> {
    const session = await getSession();
    return listMergeCategories(gameId, session.id);
}

export async function mergeCategoriesAction(body: {
    targetCategoryId: number;
    sourceCategoryIds: number[];
}): Promise<CategoryMergeResult> {
    const session = await getSession();
    return mergeCategories(body, session.id);
}

export async function listCategoryExtensionsAction(
    gameId: number,
): Promise<CategoryExtensionOptions> {
    const session = await getSession();
    return listCategoryExtensions(gameId, session.id);
}

export async function mergeCategoryExtensionsAction(body: {
    gameId: number;
    sourceGameId?: number;
}): Promise<
    { id?: number; status?: string; importing?: boolean } | { error: string }
> {
    const session = await getSession();
    try {
        return await mergeCategoryExtensions(body, session.id);
    } catch (e) {
        // The backend's 400 refusals are plain-text sentences meant for the
        // moderator ("An import for this game is still running.", etc). A
        // thrown Server Action error reaches the client with its message
        // redacted in a production build, so this has to come back as a
        // value instead — the whole point of the sentence is that it is
        // read verbatim.
        if (e instanceof ApiError) return { error: e.message };
        throw e;
    }
}

export async function requestGameMergeAction(body: {
    gameId: number;
    sourceGameId: number;
}): Promise<GameMergeRequestResult> {
    const session = await getSession();
    return requestGameMerge(body, session.id);
}
