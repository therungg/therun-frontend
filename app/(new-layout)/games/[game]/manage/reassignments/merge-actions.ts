'use server';

import { getSession } from '~src/actions/session.action';
import { listMergeCategories, mergeCategories } from '~src/lib/reassignments';
import type {
    CategoryMergeResult,
    MergeCategory,
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
): Promise<MergeCategory[]> {
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
